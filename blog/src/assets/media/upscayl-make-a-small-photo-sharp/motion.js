/* Bright coded scenes for "How to use Upscayl to make a small photo sharp again". Vanilla JS, no library.
   <figure class="mg" data-scene="NAME"> holds a still image; this script swaps in a live SVG.
   Plays only in view, honours reduced motion, "?mgstill" freezes each scene on its still frame. */
(() => {
  const NS = "http://www.w3.org/2000/svg";
  const INK = "#1A1320", YEL = "#FFCA54", BLUE = "#6C8EF5", LIL = "#B69CFF", MINT = "#7FD8AE", SKY = "#9AD8FF", SOFT = "#F1ECF9", MUTE = "#7A6A88", CAP = "#6B5878";
  const SANS = '"Space Grotesk", system-ui, sans-serif', MONO = '"JetBrains Mono", ui-monospace, monospace';
  const el = (t, a = {}, p) => { const n = document.createElementNS(NS, t); for (const k in a) n.setAttribute(k, a[k]); if (p) p.appendChild(n); return n; };
  const txt = (p, x, y, s, a = {}) => { const n = el("text", Object.assign({ x, y, "font-family": SANS, "font-size": 24, "font-weight": 600, fill: INK }, a), p); n.textContent = s; return n; };
  const lab = (p, x, y, s, size, a = {}) => txt(p, x, y, s, Object.assign({ "font-family": MONO, "font-size": size, "font-weight": 700, "text-anchor": "middle" }, a));
  const cl = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const seg = (t, a, b) => cl((t - a) / (b - a));
  const oc = (x) => 1 - Math.pow(1 - x, 3);
  const ob = (x, c = 1.70158) => 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2);
  const io = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const tf = (n, x, y, s = 1, r = 0) => n.setAttribute("transform", `translate(${x} ${y}) rotate(${r}) scale(${s})`);
  const around = (n, cx, cy, s = 1, dy = 0) => n.setAttribute("transform", `translate(${cx} ${cy + dy}) scale(${s}) translate(${-cx} ${-cy})`);
  const button = (g, label, fn) => {
    g.setAttribute("role", "button"); g.setAttribute("tabindex", "0"); g.setAttribute("aria-label", label); g.classList.add("mg-hit");
    g.addEventListener("click", fn);
    g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); } });
  };
  const ring = (p, a) => el(a.r ? "circle" : "rect", Object.assign({ fill: "none", stroke: INK, "stroke-width": 2.5, "stroke-dasharray": "4 8", "stroke-linecap": "round", class: "mg-ring" }, a), p);
  const pad = (p, a) => { const n = el("rect", Object.assign({ fill: "#fff", "fill-opacity": 0 }, a)); p.insertBefore(n, p.firstChild); return n; };
  let uid = 0; // a counter for SVG ids

  /* ---- one small photo, 256 by 192: sky, sun, hill and a lilac sign on a blue post; clean or blocky ---- */
  const hillY = (x) => 138 - 16 * Math.sin((x / 256) * Math.PI * 1.5 + 0.5);
  const pick = (x, y) => (Math.abs(x - 128) <= 42 && Math.abs(y - 80) <= 24 ? LIL : x >= 116 && x <= 140 && y > 104 && y < hillY(x) + 12 ? BLUE : (x - 48) ** 2 + (y - 48) ** 2 <= 676 ? YEL : y >= hillY(x) ? MINT : SKY);
  const photo = (p, x, y, s, blocky) => {
    const g = el("g", { transform: `translate(${x} ${y}) scale(${s})` }, p), w = (n) => n / s, id = `mgclip-upscayl-${++uid}`;
    el("rect", { width: 256, height: 192, rx: 6 }, el("clipPath", { id }, el("defs", {}, g)));
    const art = el("g", { "clip-path": `url(#${id})` }, g);
    if (blocky) {
      for (let r = 0; r < 12; r++) for (let c = 0; c < 16; c++) el("rect", { x: c * 16, y: r * 16, width: 16.6, height: 16.6, fill: pick(c * 16 + 8, r * 16 + 8) }, art);
    } else {
      el("rect", { width: 256, height: 192, fill: SKY }, art);
      el("circle", { cx: 48, cy: 48, r: 26, fill: YEL, stroke: INK, "stroke-width": w(2.5) }, art);
      let d = `M-6 ${hillY(-6).toFixed(1)}`; for (let i = 0; i <= 34; i++) d += ` L${i * 8} ${hillY(i * 8).toFixed(1)}`;
      el("path", { d: d + " L264 200 L-6 200 Z", fill: MINT, stroke: INK, "stroke-width": w(2.5), "stroke-linejoin": "round" }, art);
      el("rect", { x: 120, y: 100, width: 16, height: hillY(128) - 88, fill: BLUE, stroke: INK, "stroke-width": w(2.5) }, art);
      el("rect", { x: 86, y: 56, width: 84, height: 48, rx: 8, fill: LIL, stroke: INK, "stroke-width": w(3) }, art);
      el("rect", { x: 100, y: 68, width: 56, height: 8, rx: 4, fill: "#fff" }, art);
      el("rect", { x: 100, y: 84, width: 38, height: 8, rx: 4, fill: "#fff" }, art);
    }
    el("rect", { width: 256, height: 192, rx: 6, fill: "none", stroke: INK, "stroke-width": w(2.5) }, g);
    return g;
  };

  const SC = {};

  /* ---- 1. loose tiles slide into a blocky circle, turn into a clean yellow circle, and it grows four times as wide ---- */
  SC.mosaic = {
    dur: 8.6, still: 8.6,
    build(svg, api) {
      const B = { x: 70, y: 60, w: 660, h: 480 }, S = 25;
      const g = el("g", {}, svg), board = el("g", {}, g);
      pad(g, { x: B.x - 12, y: B.y - 12, width: B.w + 28, height: B.h + 28 });
      el("rect", { x: B.x + 12, y: B.y + 12, width: B.w, height: B.h, rx: 30, fill: LIL }, board);
      el("rect", { x: B.x, y: B.y, width: B.w, height: B.h, rx: 30, fill: SOFT, stroke: INK, "stroke-width": 3 }, board);
      ring(g, { x: B.x - 10, y: B.y - 10, width: B.w + 24, height: B.h + 24, rx: 38 });
      const LOOSE = [[285, 118, 9], [505, 122, -7], [150, 140, -12], [250, 252, -16], [560, 248, 11], [640, 150, 13], [132, 300, 8], [318, 430, -6], [488, 468, 10], [668, 322, -9], [172, 452, 15], [640, 455, -13]];
      const tiles = [];
      for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
        if ((r === 0 || r === 3) && (c === 0 || c === 3)) continue;
        const [lx, ly, lr] = LOOSE[tiles.length], n = el("g", {}, g);
        tiles.push({ n, rect: el("rect", { fill: (r + c) % 2 ? LIL : BLUE, stroke: INK, "stroke-width": 2.5, rx: 3 }, n), lx, ly, lr, tx: 362.5 + c * S, ty: 262.5 + r * S });
      }
      const dot = el("g", {}, g);
      const disc = el("circle", { cx: 400, cy: 300, r: 50, fill: YEL, stroke: INK, "stroke-width": 3 }, dot);
      const shine = el("path", { fill: "none", stroke: "#fff", "stroke-linecap": "round" }, dot);
      const tag = el("g", {}, g);
      el("path", { d: "M-46 -29 H52 Q60 -29 60 -21 V21 Q60 29 52 29 H-46 L-64 0 Z", fill: MINT, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, tag);
      el("circle", { cx: -44, cy: 0, r: 6, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, tag);
      lab(tag, 12, 11, "X4", 30);
      button(g, "Break the circle back into tiles and play it again", () => api.rewind(1.9, 1.4));
      return (t) => {
        const bk = seg(t, 0.05, 0.6);
        board.setAttribute("opacity", oc(cl(bk * 1.6))); around(board, 400, 300, 0.94 + 0.06 * ob(bk));
        const gone = seg(t, 4.35, 4.8);
        tiles.forEach((T, i) => {
          const a = seg(t, 0.55 + i * 0.08, 1.0 + i * 0.08), m = io(seg(t, 2.2 + i * 0.06, 3.5 + i * 0.06));
          const x = T.lx + (T.tx - T.lx) * m, y = T.ly + (T.ty - T.ly) * m - 46 * (1 - ob(a)), w = S * (1.6 - 0.6 * m);
          T.rect.setAttribute("x", -w / 2); T.rect.setAttribute("y", -w / 2); T.rect.setAttribute("width", w); T.rect.setAttribute("height", w);
          tf(T.n, x, y, 1 + 0.08 * Math.sin(Math.PI * seg(t, 3.5 + i * 0.06, 3.85 + i * 0.06)), T.lr * (1 - m));
          T.n.setAttribute("opacity", cl(a * 3) * (1 - gone));
        });
        const ci = seg(t, 4.3, 4.8), gr = seg(t, 5.0, 6.4), r = 50 * (0.8 + 0.2 * ob(ci)) + 150 * ob(gr, 1.2);
        disc.setAttribute("r", r); dot.setAttribute("opacity", cl(ci * 2.5));
        const rr = r * 0.74, a0 = -2.6, a1 = -1.95;
        shine.setAttribute("d", `M${400 + rr * Math.cos(a0)} ${300 + rr * Math.sin(a0)} A${rr} ${rr} 0 0 1 ${400 + rr * Math.cos(a1)} ${300 + rr * Math.sin(a1)}`);
        shine.setAttribute("stroke-width", Math.max(3, r * 0.07));
        const tg = seg(t, 6.5, 7.3), td = ob(tg);
        tag.setAttribute("opacity", cl(tg * 4)); tf(tag, 676, 76 - 110 * (1 - td), 1, -8 - 16 * (1 - td));
      };
    },
  };

  /* ---- 2. a loupe glides from the Original card to the Result card ---- */
  SC.loupe = {
    dur: 9.2, still: 9.2,
    build(svg, api) {
      svg = el("g", { transform: "translate(0 -12)" }, svg);
      const floor = el("rect", { x: 40, y: 446, width: 720, height: 14, rx: 7, fill: SOFT }, svg);
      const cards = [["Original", 72, true], ["Result", 432, false]].map(([name, x, blocky]) => {
        const g = el("g", {}, svg);
        el("rect", { x: x + 10, y: 174, width: 296, height: 266, rx: 18, fill: LIL }, g);
        el("rect", { x, y: 164, width: 296, height: 266, rx: 18, fill: SOFT, stroke: INK, "stroke-width": 3 }, g);
        photo(g, x + 20, 184, 1, blocky);
        return { g, l: lab(svg, x + 148, 416, name, 22), x };
      });
      const R0 = [220, 264], R1 = [580, 264];
      const band = (w) => { const g = el("g", {}, svg); return { g, a: el("circle", { cx: R1[0], cy: R1[1], fill: "none", stroke: INK, "stroke-width": w + 5 }, g), b: el("circle", { cx: R1[0], cy: R1[1], fill: "none", stroke: SKY, "stroke-width": w }, g) }; };
      const pulses = [band(8), band(8)], halo = band(9);
      const lp = el("g", {}, svg), hd = el("g", { transform: "rotate(45)" }, lp);
      el("rect", { x: 80, y: -14, width: 90, height: 28, rx: 14, fill: YEL, stroke: INK, "stroke-width": 3 }, hd);
      el("rect", { x: 66, y: -17, width: 20, height: 34, rx: 6, fill: BLUE, stroke: INK, "stroke-width": 3 }, hd);
      el("circle", { r: 60, fill: "#fff", "fill-opacity": 0, stroke: INK, "stroke-width": 20 }, lp);
      el("circle", { r: 60, fill: "none", stroke: BLUE, "stroke-width": 14 }, lp);
      el("path", { d: "M-38 -14 A40 40 0 0 1 -14 -38", fill: "none", stroke: "#fff", "stroke-width": 6, "stroke-linecap": "round" }, lp);
      ring(lp, { r: 100 });
      button(lp, "Send the loupe back to the Original card", () => api.rewind(2.3, 1.2));
      return (t) => {
        floor.setAttribute("opacity", oc(seg(t, 0, 0.4)));
        cards.forEach((c, i) => {
          const a = seg(t, 0.15 + i * 0.12, 0.8 + i * 0.12), b = seg(t, 1.0 + i * 0.1, 1.45 + i * 0.1);
          c.g.setAttribute("opacity", cl(a * 2.5)); tf(c.g, 0, 44 * (1 - ob(a)));
          c.l.setAttribute("opacity", cl(b * 2.5));
          around(c.l, c.x + 148, 408, i ? 1 + 0.12 * Math.sin(Math.PI * seg(t, 5.0, 5.45)) : 1, -12 * (1 - oc(b)));
        });
        const e = seg(t, 1.5, 2.1), m = io(seg(t, 3.0, 5.0)), q = seg(t, 5.0, 5.6);
        const x = R0[0] + (R1[0] - R0[0]) * m + 26 * Math.sin(Math.PI * q) * (1 - q), y = R0[1] - 64 * Math.sin(Math.PI * m);
        tf(lp, x, y, (0.6 + 0.4 * ob(e)) * (1 + 0.05 * Math.sin(Math.PI * q)), -7 * Math.sin(Math.PI * m));
        lp.setAttribute("opacity", cl(e * 3));
        pulses.forEach((c, i) => { const k = seg(t, 5.15 + i * 0.6, 6.25 + i * 0.6), r = 74 + 50 * oc(k); c.a.setAttribute("r", r); c.b.setAttribute("r", r); c.g.setAttribute("opacity", k > 0 && k < 1 ? 1 - k : 0); });
        const h = seg(t, 6.3, 6.9), hr = 70 + 12 * ob(h); halo.g.setAttribute("opacity", cl(h * 2)); halo.a.setAttribute("r", hr); halo.b.setAttribute("r", hr);
      };
    },
  };

  /* ---- 3. the enlarged photo in a yellow frame, the kept one in a blue frame, both on a lilac shelf ---- */
  SC.frame = {
    dur: 9, still: 9,
    build(svg, api) {
      svg = el("g", { transform: "translate(0 -18)" }, svg);
      const big = el("g", {}, svg);
      el("rect", { x: 70, y: 148, width: 360, height: 282, rx: 10, fill: YEL, stroke: INK, "stroke-width": 3 }, big);
      photo(big, 94, 172, 312 / 256, false);
      const small = el("g", {}, svg);
      el("rect", { x: 540, y: 283, width: 186, height: 147, rx: 8, fill: BLUE, stroke: INK, "stroke-width": 3 }, small);
      photo(small, 556, 299, 0.6, true);
      const shelf = el("g", {}, svg);
      [150, 650].forEach((x) => el("path", { d: `M${x - 18} 456 H${x + 18} L${x} 488 Z`, fill: LIL, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, shelf));
      el("rect", { x: 56, y: 430, width: 688, height: 28, rx: 12, fill: LIL, stroke: INK, "stroke-width": 3 }, shelf);
      const hang = (px, py, w, h, str, fill, name, size) => {
        const pv = el("g", {}, svg), g = el("g", {}, pv);
        tf(pv, px, py);
        el("path", { d: `M0 0 V${str + 9}`, stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round" }, g);
        el("rect", { x: -w / 2, y: str, width: w, height: h, rx: 12, fill, stroke: INK, "stroke-width": 3 }, g);
        el("circle", { cx: 0, cy: str + 9, r: 4.5, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, g);
        lab(g, 0, str + h - 13, name, size);
        el("circle", { r: 5, fill: YEL, stroke: INK, "stroke-width": 2.5 }, pv);
        return { pv, g };
      };
      const og = hang(720, 289, 116, 48, 22, SOFT, "Original", 16), en = hang(424, 154, 148, 56, 28, MINT, "Enhanced", 19);
      pad(en.g, { x: -86, y: 0, width: 172, height: 100 });
      ring(en.g, { x: -84, y: 18, width: 168, height: 76, rx: 18 });
      let tapAt = -99;
      button(en.g, "Swing the Enhanced tag again", () => { tapAt = api.now(); api.poke(); });
      return (t, now) => {
        [big, small].forEach((g, i) => { const a = seg(t, 0.1 + i * 0.12, 0.75 + i * 0.12); g.setAttribute("opacity", cl(a * 2.5)); tf(g, 0, -40 * (1 - ob(a))); });
        const sh = seg(t, 1.0, 1.9); tf(shelf, -760 * (1 - ob(sh, 0.9)), 0); shelf.setAttribute("opacity", sh > 0 ? 1 : 0);
        const oa = seg(t, 2.1, 2.5), ot = Math.max(0, t - 2.1);
        og.pv.setAttribute("opacity", cl(oa * 3));
        og.g.setAttribute("transform", `rotate(${12 * Math.exp(-2 * ot) * Math.cos(5 * ot) * (1 - seg(ot, 2, 2.6))}) scale(${0.7 + 0.3 * ob(oa)})`);
        const ea = seg(t, 2.9, 3.3), et = Math.max(0, t - 2.9), s = now - tapAt, busy = s >= 0 && s < 4.6;
        let th = 34 * Math.exp(-1.05 * et) * Math.cos(4.2 * et) * (1 - seg(et, 3.4, 4.6));
        if (busy) th += 24 * Math.exp(-1.05 * s) * Math.sin(4.2 * s) * (1 - seg(s, 3.4, 4.6));
        en.pv.setAttribute("opacity", cl(ea * 3));
        en.g.setAttribute("transform", `rotate(${th}) scale(${0.6 + 0.4 * ob(ea)})`);
        return busy;
      };
    },
  };

  /* ---- title card, 16 by 9 ---- */
  SC.hero = {
    w: 1600, h: 900, dur: 4, still: 4,
    build(svg) {
      const pill = el("g", {}, svg);
      el("rect", { x: 96, y: 88, width: 156, height: 58, rx: 29, fill: YEL, stroke: INK, "stroke-width": 3 }, pill);
      lab(pill, 174, 127, "Guide", 28);
      const lines = [txt(svg, 92, 270, "Upscayl: make a small", { "font-size": 92, "font-weight": 700 }), txt(svg, 92, 374, "photo sharp again", { "font-size": 92, "font-weight": 700 })];
      const ul = el("path", { stroke: YEL, "stroke-width": 14, "stroke-linecap": "round", fill: "none" }, svg);
      const sub = txt(svg, 96, 472, "Free, open source, works on your own computer", { "font-size": 36, "font-weight": 500, fill: MUTE });
      const chk = txt(svg, 96, 524, "Checked 25 Nov 2026", { "font-family": MONO, "font-size": 24, "font-weight": 500, fill: CAP });
      const tiles = [[96, LIL, "X4 per side"], [824, SKY, "Pixelated yes, blurred no"]].map(([x, col, s]) => {
        const g = el("g", {}, svg);
        el("rect", { x: x + 12, y: 612, width: 680, height: 220, rx: 28, fill: SOFT }, g);
        el("rect", { x, y: 600, width: 680, height: 220, rx: 28, fill: col, stroke: INK, "stroke-width": 3 }, g);
        return { g, icon: el("g", {}, g), label: txt(g, x + 44, 778, s, { "font-family": MONO, "font-size": 38, "font-weight": 700 }) };
      });
      const blocks = [];
      for (let r = 0; r < 2; r++) for (let c = 0; c < 12; c++) if (r === 0 || c % 3 !== 2) blocks.push([c, r, el("rect", { x: 140 + c * 32, y: 632 + r * 32, width: 28, height: 28, rx: 3, fill: BLUE, stroke: INK, "stroke-width": 2.5 }, tiles[0].icon)]);
      const lo = el("g", {}, tiles[1].icon), lh = el("g", { transform: "rotate(45)" }, lo);
      el("rect", { x: 40, y: -10, width: 52, height: 20, rx: 10, fill: YEL, stroke: INK, "stroke-width": 3 }, lh);
      el("circle", { r: 30, fill: "none", stroke: INK, "stroke-width": 17 }, lo);
      el("circle", { r: 30, fill: "none", stroke: YEL, "stroke-width": 11 }, lo);
      return (t) => {
        const p = seg(t, 0.1, 0.55); pill.setAttribute("opacity", cl(p * 3)); around(pill, 174, 117, 0.7 + 0.3 * ob(p));
        lines.forEach((n, i) => { const a = seg(t, 0.25 + i * 0.1, 0.85 + i * 0.1); n.setAttribute("opacity", cl(a * 2)); n.setAttribute("transform", `translate(0 ${26 * (1 - oc(a))})`); });
        ul.setAttribute("d", `M98 404 H${98 + 470 * oc(seg(t, 0.9, 1.4)) + 0.01}`); ul.setAttribute("opacity", t > 0.9 ? 1 : 0);
        [sub, chk].forEach((n, i) => { const a = seg(t, 0.6 + i * 0.1, 1.1 + i * 0.1); n.setAttribute("opacity", cl(a * 2)); n.setAttribute("transform", `translate(0 ${16 * (1 - oc(a))})`); });
        tiles.forEach((T, i) => {
          const a = seg(t, 1.0 + i * 0.12, 1.6 + i * 0.12), b = seg(t, 2.2 + i * 0.1, 2.65 + i * 0.1);
          T.g.setAttribute("opacity", cl(a * 2.5)); T.g.setAttribute("transform", `translate(0 ${40 * (1 - ob(a))})`);
          T.label.setAttribute("opacity", cl(b * 2.5)); T.label.setAttribute("transform", `translate(0 ${14 * (1 - oc(b))})`);
        });
        blocks.forEach(([c, r, n], i) => { const a = seg(t, 1.5 + i * 0.03, 1.8 + i * 0.03); n.setAttribute("opacity", cl(a * 3)); around(n, 154 + c * 32, 646 + r * 32, 0.5 + 0.5 * ob(a)); });
        const l = seg(t, 1.7, 2.2); lo.setAttribute("opacity", cl(l * 3)); tf(lo, 904, 664, 0.6 + 0.4 * ob(l), -20 * (1 - oc(l)));
      };
    },
  };

  /* ---- player: plays once in view, holds the final frame; a tap rewinds or replays ---- */
  const q = new URLSearchParams(location.search), frozen = q.has("mgstill"), fixed = parseFloat(q.get("mgstill"));
  const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const mount = (fig) => {
    const sc = SC[fig.dataset.scene], img = fig.querySelector("img"); if (!sc || !img) return;
    const W = sc.w || 800, H = sc.h || 600;
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, class: "mg-svg", role: "group", "aria-label": img.alt || "" });
    svg.style.aspectRatio = `${W} / ${H}`;
    el("rect", { width: W, height: H, fill: "#fff" }, svg);
    img.replaceWith(svg);
    let off = 0, raf = 0, seen = false, held = calm, rw = null, last = 0;
    const base = performance.now(), clock = () => (performance.now() - base) / 1000;
    let draw = () => false;
    const at = () => {
      if (held) return sc.still;
      if (rw) { const p = (clock() - rw.at) / rw.len; if (p < 1) return rw.from + (rw.to - rw.from) * io(p); off = rw.to - clock(); rw = null; }
      return cl(clock() + off, 0, sc.dur);
    };
    const frame = () => { const t = at(); last = t; return draw(t, clock()) || !!rw || (!held && t < sc.dur); };
    const tick = () => { cancelAnimationFrame(raf); if (frame() && seen) raf = requestAnimationFrame(tick); };
    const api = {
      now: clock,
      rewind: (to, len) => { rw = { from: last, to, at: clock(), len }; held = false; tick(); },
      poke: () => { if (held) { off = sc.still - clock(); held = false; } tick(); },
    };
    draw = sc.build(svg, api);
    if (frozen) { draw(isNaN(fixed) ? sc.still : fixed, 0); return; }
    new IntersectionObserver(([e]) => {
      seen = e.isIntersecting;
      if (seen) { if (!rw && !held) off = last - clock(); tick(); if (!fig.dataset.sent && window.posthog) { fig.dataset.sent = 1; window.posthog.capture("blog_scene_view", { slug: location.pathname.split("/").filter(Boolean).pop(), scene: fig.dataset.scene }); } }
      else cancelAnimationFrame(raf);
    }, { threshold: 0.25 }).observe(fig);
    svg.addEventListener("click", () => { if (!fig.dataset.hit && window.posthog) { fig.dataset.hit = 1; window.posthog.capture("blog_scene_interact", { slug: location.pathname.split("/").filter(Boolean).pop(), scene: fig.dataset.scene }); } });
    frame();
  };
  const go = () => document.querySelectorAll("figure.mg[data-scene]").forEach(mount);
  const fonts = document.fonts && document.fonts.load ? Promise.all([document.fonts.load('700 32px "Space Grotesk"'), document.fonts.load('500 20px "Space Grotesk"'), document.fonts.load('700 20px "JetBrains Mono"'), document.fonts.load('500 20px "JetBrains Mono"')]).catch(() => {}) : Promise.resolve();
  const start = () => fonts.then(go, go);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
