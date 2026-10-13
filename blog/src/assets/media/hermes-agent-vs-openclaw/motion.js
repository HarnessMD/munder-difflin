/* Bright coded scenes for "Hermes Agent vs OpenClaw". Vanilla JS, no library.
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

  const GREY = "#D9D0E4";
  const num = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+$)/g, ",");
  /* a rounded label sized to its text, centred on 0,0 */
  const chip = (p, s, fill, a = {}) => {
    const g = el("g", {}, p), r = el("rect", { y: -20, height: 40, rx: 12, fill, stroke: INK, "stroke-width": 2.5 }, g);
    const t = txt(g, 0, 7, s, Object.assign({ "text-anchor": "middle", "font-size": 20, "font-weight": 700 }, a));
    const w = t.getComputedTextLength() + 30; r.setAttribute("x", -w / 2); r.setAttribute("width", w);
    return { g, w };
  };
  const show = (n, k) => n.setAttribute("opacity", k <= 0.01 ? 0 : 1);

  const SC = {};

  /* ---- 1. two measuring jugs fill at the same speed; one stops sooner ---- */
  SC.jugs = {
    dur: 10.6, still: 8.2,
    build(svg) {
      txt(svg, 44, 62, "GitHub stars on 7 Oct 2026", { "font-size": 32, "font-weight": 700 });
      txt(svg, 44, 98, "From the GitHub API. Both are MIT licensed.", { "font-size": 20, "font-weight": 500, fill: MUTE });
      const BASE = 448, FULL = 290, TOP = 450000, RATE = 66;
      const body = `M-100 ${-FULL} V-16 Q-100 0 -84 0 H84 Q100 0 100 -16 V${-FULL}`;
      const mk = (x, name, stars, col, id) => {
        const g = el("g", { transform: `translate(${x} ${BASE})` }, svg);
        el("path", { d: body + " Z" }, el("clipPath", { id }, g));
        const liq = el("path", { fill: col, "clip-path": `url(#${id})` }, g);
        const bub = [0, 1, 2].map(() => el("circle", { r: 5, fill: "#fff", "fill-opacity": 0.7, "clip-path": `url(#${id})` }, g));
        for (let k = 1; k <= 4; k++) el("path", { d: `M-98 ${-k * 62} h20`, stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round" }, g);
        el("path", { d: body, fill: "none", stroke: INK, "stroke-width": 3, "stroke-linejoin": "round", "stroke-linecap": "round" }, g);
        el("path", { d: `M-100 ${-FULL} q-14 -2 -20 -14`, fill: "none", stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, g);
        el("path", { d: `M100 ${-FULL + 36} h26 q22 0 22 22 v96 q0 22 -22 22 h-26`, fill: "none", stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, g);
        const target = (stars / TOP) * FULL;
        const n = txt(g, 6, -target + 46, num(stars), { "text-anchor": "middle", "font-size": 34, "font-weight": 700 });
        const s = txt(g, 6, -target + 72, "stars", { "text-anchor": "middle", "font-size": 20, "font-weight": 500 });
        const mit = chip(g, "MIT", "#fff");
        txt(svg, x, BASE + 40, name, { "text-anchor": "middle", "font-size": 24, "font-weight": 700 });
        return { liq, bub, n, s, mit, target, stars, x };
      };
      const J = [mk(214, "Hermes Agent", 251736, LIL, "mgj0"), mk(586, "OpenClaw", 391524, BLUE, "mgj1")];
      const mark = el("path", { d: `M108 ${BASE - J[0].target} H694`, stroke: INK, "stroke-width": 2.5, "stroke-dasharray": "3 9", "stroke-linecap": "round" }, svg);
      const cap = strip(svg, 520, 640);
      return (t) => {
        const out = io(seg(t, 9.7, 10.4));
        J.forEach((j, i) => {
          const lv = Math.min(j.target, Math.max(0, t - 0.6) * RATE) * (1 - out), busy = lv < j.target - 0.5 && lv > 2 ? 1 : 0.35;
          let d = `M-100 2 V${-lv}`;
          for (let x = -100; x <= 100; x += 20) d += ` L${x} ${(-lv + Math.sin(x * 0.06 + t * 5 + i * 2) * 3.5 * busy).toFixed(1)}`;
          j.liq.setAttribute("d", d + " V2 Z");
          j.bub.forEach((b, k) => { const p = (t * 0.7 + k / 3 + i * 0.4) % 1; b.setAttribute("cx", -60 + k * 55 + Math.sin(p * 6 + k) * 6); b.setAttribute("cy", -8 - (lv - 16) * p); b.setAttribute("opacity", lv > 30 && busy === 1 ? Math.sin(p * Math.PI) : 0); });
          const txo = oc(seg(lv, j.target - 6, j.target)) * (1 - seg(t, 9.5, 9.8));
          j.n.setAttribute("opacity", txo); j.s.setAttribute("opacity", txo);
          j.n.setAttribute("transform", `translate(0 ${10 * (1 - txo)})`);
          const p = ob(seg(t, 5.0 + i * 0.35, 5.4 + i * 0.35)) * (1 - seg(t, 9.5, 9.8));
          tf(j.mit.g, 6, -40, cl(p, 0, 1.3), 0); show(j.mit.g, p);
        });
        const m = seg(t, 6.1, 6.9) * (1 - seg(t, 9.5, 9.8));
        mark.setAttribute("stroke-dashoffset", 0); mark.setAttribute("opacity", m);
        cap.textContent = t < 3 || t > 9.7 ? "Each jug fills at the same speed" : t < 4.5 ? "Hermes Agent stops at 251,736 stars" : t < 6.1 ? "OpenClaw keeps going to 391,524 stars" : "OpenClaw is the larger project by stars. Both are MIT.";
      };
    },
  };

  /* ---- 2. two pigeonhole racks; the same six letters land in both ---- */
  SC.cubbies = {
    dur: 11, still: 8.8,
    build(svg, api) {
      txt(svg, 44, 62, "Six chat apps, both projects", { "font-size": 32, "font-weight": 700 });
      txt(svg, 756, 60, "tap a cubby", { "text-anchor": "end", "font-size": 20, fill: MUTE, "font-weight": 500 });
      const APPS = ["Telegram", "Discord", "Slack", "WhatsApp", "Signal", "Teams"], COL = [SKY, LIL, YEL, MINT, BLUE, LIL];
      const CW = 170, CH = 112, TOPY = 138;
      let pinned = -1;
      const racks = [[40, "Hermes Agent"], [420, "OpenClaw"]].map(([x0, name]) => {
        txt(svg, x0 + CW, 120, name, { "text-anchor": "middle", "font-size": 24, "font-weight": 700 });
        el("rect", { x: x0, y: TOPY, width: CW * 2, height: CH * 3 + 8, rx: 22, fill: "#fff", stroke: INK, "stroke-width": 3 }, svg);
        return APPS.map((app, i) => {
          const cx = x0 + (i % 2) * CW + CW / 2, cy = TOPY + Math.floor(i / 2) * CH + 46;
          const g = el("g", {}, svg);
          el("rect", { x: cx - 80, y: cy - 40, width: 160, height: 108, rx: 18, fill: "#fff", "fill-opacity": 0, stroke: INK, "stroke-width": 2, "stroke-dasharray": "3 7", class: "mg-ring" }, g);
          const hole = el("rect", { x: cx - 68, y: cy - 32, width: 136, height: 64, rx: 14, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, g);
          txt(g, cx, cy + 58, app, { "text-anchor": "middle", "font-size": 20, "font-weight": 600 });
          button(g, `${app}: named in both projects' docs`, () => { pinned = i; api.poke(); });
          return { cx, cy, hole, i };
        });
      });
      const letters = racks.map((r) => r.map((c) => {
        const g = el("g", { "pointer-events": "none" }, svg);
        el("rect", { x: -40, y: -24, width: 80, height: 48, rx: 8, fill: COL[c.i], stroke: INK, "stroke-width": 3 }, g);
        el("path", { d: "M-38 -20 L0 6 L38 -20", fill: "none", stroke: INK, "stroke-width": 3, "stroke-linecap": "round", "stroke-linejoin": "round" }, g);
        const k = el("g", { "pointer-events": "none" }, svg);
        el("circle", { r: 13, fill: MINT, stroke: INK, "stroke-width": 2.5 }, k);
        el("path", { d: "M-6 0 L-2 5 L6 -5", stroke: INK, "stroke-width": 3, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, k);
        return { g, k, c };
      }));
      const cap = strip(svg, 508, 640);
      const land = (i) => 1.3 + i * 1.05;
      return (t) => {
        const out = seg(t, 10.2, 10.8);
        let last = -1;
        APPS.forEach((_, i) => { if (t >= land(i)) last = i; });
        letters.forEach((r) => r.forEach(({ g, k, c }) => {
          const a = land(c.i), p = io(seg(t, a - 0.7, a)), sq = Math.sin(seg(t, a, a + 0.3) * Math.PI) * 0.12;
          const x = 400 + (c.cx - 400) * p, y = 112 + (c.cy - 112) * p - 30 * Math.sin(Math.PI * p);
          g.setAttribute("transform", `translate(${x} ${y}) rotate(${(1 - p) * -14}) scale(${(0.5 + 0.5 * p) * (1 + sq)} ${(0.5 + 0.5 * p) * (1 - sq)})`);
          g.setAttribute("opacity", seg(t, a - 0.7, a - 0.55) * (1 - out));
          const q = ob(seg(t, a + 0.1, a + 0.45)) * (1 - out);
          tf(k, c.cx + 60, c.cy - 26, cl(q, 0, 1.3)); show(k, q);
          c.hole.setAttribute("fill", pinned === c.i ? YEL : SOFT);
        }));
        cap.textContent = pinned >= 0 ? `${APPS[pinned]}: named in both projects' docs` : last < 0 || t > 8 ? "Six chat apps both projects' docs name" : `${APPS[last]}: named in both projects' docs`;
      };
    },
  };

  /* ---- 3. two short drawers fill up and stop; a shelf keeps taking dated folders ---- */
  SC.drawers = {
    dur: 12, still: 8.8,
    build(svg, api) {
      txt(svg, 44, 62, "Capped files, or a growing shelf", { "font-size": 32, "font-weight": 700 });
      const HOLD = 8.8, CX = 124;
      let user = false, extra = 0, tap = -99;
      el("path", { d: "M400 110 V486", stroke: GREY, "stroke-width": 2, "stroke-dasharray": "3 9", "stroke-linecap": "round" }, svg);

      /* left: the chest */
      txt(svg, 40, 128, "Hermes Agent", { "font-size": 24, "font-weight": 700 });
      el("rect", { x: CX, y: 130, width: 270, height: 320 }, el("clipPath", { id: "mgdr" }, svg));
      const tray = (y, len, n, file, chars, t0, col, tries) => {
        const g = el("g", { "clip-path": "url(#mgdr)" }, svg), mv = el("g", {}, g);
        el("path", { d: `M0 0 V52 H${len} V0`, fill: "#fff", stroke: INK, "stroke-width": 3, "stroke-linejoin": "round", "stroke-linecap": "round" }, mv);
        el("path", { d: `M${len} 26 h12`, stroke: INK, "stroke-width": 3 }, mv);
        el("circle", { cx: len + 18, cy: 26, r: 7, fill: YEL, stroke: INK, "stroke-width": 2.5 }, mv);
        const pitch = (len - 12) / n;
        const cards = Array.from({ length: n }, (_, i) => el("rect", { x: -6.5, y: -38, width: 13, height: 38, rx: 4, fill: col, stroke: INK, "stroke-width": 2.5 }, mv));
        txt(svg, CX + 14, y + 80, file, { "font-family": MONO, "font-size": 20, "font-weight": 700 });
        const l2 = txt(svg, CX + 14, y + 108, chars, { "font-size": 20, "font-weight": 500 });
        const full = chip(svg, "full", MINT);
        const fx = CX + 14 + l2.getComputedTextLength() + 14 + full.w / 2;
        const stray = el("rect", { x: -6.5, y: -19, width: 13, height: 38, rx: 4, fill: "#fff", stroke: INK, "stroke-width": 2.5, "stroke-dasharray": "4 4" }, svg);
        return (t, w) => {
          const open = oc(seg(t, t0, t0 + 0.7)) - io(seg(t, 11.1, 11.7));
          mv.setAttribute("transform", `translate(${CX - len + len * open} ${y})`);
          cards.forEach((c, i) => { const a = t0 + 0.9 + i * 0.22, q = seg(t, a, a + 0.25); c.setAttribute("transform", `translate(${12 + pitch * (i + 0.5) - 3} ${47 - 22 * (1 - q * q)})`); c.setAttribute("opacity", q <= 0 ? 0 : 1); });
          const done = t0 + 0.9 + n * 0.22 + 0.2, f = ob(seg(t, done, done + 0.35)) * (1 - seg(t, 11, 11.2));
          tf(full.g, fx, y + 101, cl(f, 0, 1.3)); show(full.g, f);
          /* one more card tries, and bounces off */
          const b = !tries ? 0 : w >= 0 && w < 1 ? w : seg(t, done + 0.5, done + 1.5), ex = CX + len - 8, on = b > 0 && b < 1;
          const bx = b < 0.4 ? ex + 34 * (1 - b / 0.4) : ex + 40 * ((b - 0.4) / 0.6), by = b < 0.4 ? y - 58 + 50 * (b / 0.4) * (b / 0.4) : y - 8 - 90 * Math.sin(((b - 0.4) / 0.6) * Math.PI) * 0.5 + 60 * ((b - 0.4) / 0.6);
          tf(stray, bx, by, 1, b * 200); stray.setAttribute("opacity", on ? 1 - seg(b, 0.7, 1) : 0);
        };
      };
      const T1 = tray(160, 220, 11, "MEMORY.md", "2,200 characters", 0.5, LIL, true), T2 = tray(300, 138, 7, "USER.md", "1,375 characters", 1.2, SKY, false);
      el("rect", { x: 40, y: 144, width: 84, height: 290, rx: 16, fill: SOFT, stroke: INK, "stroke-width": 3 }, svg);
      [186, 326].forEach((y) => el("rect", { x: 100, y: y - 30, width: 24, height: 60, rx: 0, fill: "#fff", stroke: INK, "stroke-width": 3 }, svg));

      /* right: the shelf and the binder */
      txt(svg, 420, 128, "OpenClaw", { "font-size": 24, "font-weight": 700 });
      const SH = 404, FX = (i) => 432 + i * 30;
      el("path", { d: `M416 ${SH} H764`, stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, svg);
      el("path", { d: `M440 ${SH} v14 M740 ${SH} v14`, stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, svg);
      txt(svg, 420, 446, "memory/YYYY-MM-DD.md", { "font-family": MONO, "font-size": 20, "font-weight": 700 });
      txt(svg, 420, 474, "daily notes", { "font-size": 20, "font-weight": 500 });
      const BX = 648, BY = 196;
      const path = el("path", { d: `M${FX(2) + 13} 318 Q${FX(2) + 20} 250 ${BX - 96} ${BY + 22}`, fill: "none", stroke: INK, "stroke-width": 2.5, "stroke-dasharray": "3 8", "stroke-linecap": "round" }, svg);
      const dream = txt(svg, 544, 292, "dreaming", { "font-size": 20, "font-weight": 500, fill: MUTE, "font-style": "italic" });
      const binder = el("g", {}, svg);
      el("rect", { x: -92, y: -46, width: 196, height: 92, rx: 14, fill: MINT, stroke: INK, "stroke-width": 3 }, binder);
      el("path", { d: "M-70 -46 V46", stroke: INK, "stroke-width": 3 }, binder);
      [-22, 22].forEach((y) => el("circle", { cx: -81, cy: y, r: 5, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, binder));
      txt(binder, 17, -6, "MEMORY.md", { "text-anchor": "middle", "font-family": MONO, "font-size": 20, "font-weight": 700 });
      txt(binder, 17, 24, "long-term", { "text-anchor": "middle", "font-size": 20, "font-weight": 500 });
      const folders = Array.from({ length: 11 }, (_, i) => {
        const g = el("g", {}, svg);
        el("path", { d: "M0 -76 h14 l4 8 h8 V0 H0 Z", fill: i < 5 ? SKY : YEL, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, g);
        return g;
      });
      const card = el("g", {}, svg);
      el("rect", { x: -14, y: -18, width: 28, height: 36, rx: 5, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, card);
      el("path", { d: "M-7 -7 H7 M-7 1 H7 M-7 9 H2", stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round" }, card);

      const add = el("g", { transform: "translate(676 54)" }, svg);
      el("rect", { x: -86, y: -28, width: 172, height: 56, rx: 28, fill: "none", stroke: INK, "stroke-width": 2, "stroke-dasharray": "3 7", class: "mg-ring" }, add);
      el("rect", { x: -80, y: -22, width: 160, height: 44, rx: 22, fill: YEL, stroke: INK, "stroke-width": 3 }, add);
      txt(add, 0, 7, "+ add a day", { "text-anchor": "middle", "font-size": 20, "font-weight": 700 });
      button(add, "Add a day. OpenClaw gains one more dated note; the two Hermes Agent files stay capped.", () => { user = true; extra = extra >= 6 ? 0 : extra + 1; tap = api.now(); api.poke(); });
      const cap = strip(svg, 520, 660);
      return (t0, now) => {
        const t = user ? HOLD : t0, w = now - tap, out = seg(t, 11, 11.5);
        T1(t, w); T2(t, w - 0.12);
        folders.forEach((g, i) => {
          let k;
          if (i < 5) k = ob(seg(t, 2.2 + i * 0.6, 2.55 + i * 0.6));
          else k = i - 5 < extra ? (i - 5 === extra - 1 ? ob(cl(w / 0.35)) : 1) : 0;
          g.setAttribute("transform", `translate(${FX(i)} ${SH - 1.5}) scale(1 ${cl(k, 0, 1.25)})`);
          g.setAttribute("opacity", (k <= 0.01 ? 0 : 1) * (1 - out));
        });
        const f = io(seg(t, 5.8, 7.3)), x0 = FX(2) + 13, y0 = 318, x1 = BX - 96, y1 = BY + 22, cx = FX(2) + 20, cy = 250;
        const px = (1 - f) * (1 - f) * x0 + 2 * (1 - f) * f * cx + f * f * x1, py = (1 - f) * (1 - f) * y0 + 2 * (1 - f) * f * cy + f * f * y1;
        tf(card, px, py - 18 * seg(t, 5.4, 5.8) * (1 - f), 1 - 0.25 * seg(f, 0.8, 1), Math.sin(f * 9) * 8);
        card.setAttribute("opacity", seg(t, 5.4, 5.6) * (1 - seg(f, 0.9, 1)));
        const pk = seg(t, 5.2, 5.7) * (1 - out);
        path.setAttribute("opacity", pk); dream.setAttribute("opacity", pk);
        tf(binder, BX, BY, 1 + 0.07 * Math.sin(seg(t, 7.2, 7.6) * Math.PI));
        cap.textContent = w >= 0 && w < 4 ? (extra ? "One more day, one more dated note. The two files stay capped." : "Shelf cleared. The two files are still capped.") : t < 2.2 || t > 11 ? "Hermes Agent caps two files" : t < 5.2 ? "OpenClaw adds dated notes" : t < 7.6 ? "Dreaming promotes qualified items into MEMORY.md" : "Hermes Agent caps two files. OpenClaw adds dated notes.";
      };
    },
  };

  /* ---- 4. two doors open on what is behind each; a paper plane carries a setup across ---- */
  SC.doors = {
    dur: 12, still: 9.6,
    build(svg) {
      txt(svg, 44, 62, "Who should pick which?", { "font-size": 32, "font-weight": 700 });
      const DW = 290, Y0 = 130, Y1 = 420, SL = 0.16;
      const mk = (x0, hingeRight, name, col, items, t0) => {
        const mid = x0 + DW / 2, vis = hingeRight ? x0 + (DW * (1 - SL)) / 2 : x0 + DW * SL + (DW * (1 - SL)) / 2;
        txt(svg, mid, 114, name, { "text-anchor": "middle", "font-size": 24, "font-weight": 700 });
        el("rect", { x: x0, y: Y0, width: DW, height: Y1 - Y0, rx: 8, fill: "#fff", stroke: INK, "stroke-width": 3 }, svg);
        el("rect", { x: x0 - 16, y: Y1, width: DW + 32, height: 14, rx: 7, fill: SOFT, stroke: INK, "stroke-width": 3 }, svg);
        const lead = txt(svg, vis, Y0 + (items.length === 2 ? 76 : 58), "if you want", { "text-anchor": "middle", "font-size": 20, "font-weight": 500, fill: MUTE });
        const gap = items.length === 2 ? 66 : 60, top = Y0 + (items.length === 2 ? 142 : 116);
        const chips = items.map((s, i) => { const c = chip(svg, s, i % 2 ? "#fff" : SOFT); return { g: c.g, y: top + i * gap }; });
        const door = el("rect", { y: Y0, height: Y1 - Y0, rx: 8, fill: col, stroke: INK, "stroke-width": 3 }, svg);
        const pan = [0, 1].map(() => el("rect", { rx: 8, fill: "none", stroke: INK, "stroke-width": 2.5 }, svg));
        const knob = el("circle", { cy: (Y0 + Y1) / 2 + 10, r: 9, fill: YEL, stroke: INK, "stroke-width": 3 }, svg);
        return (t) => {
          const o = io(seg(t, t0, t0 + 1)) - io(seg(t, 10.9, 11.6)), w = DW * (1 - (1 - SL) * o), x = hingeRight ? x0 + DW - w : x0;
          door.setAttribute("x", x); door.setAttribute("width", w);
          const m = Math.min(26, w * 0.2), pw = w - 2 * m;
          pan.forEach((p, i) => { p.setAttribute("x", x + m); p.setAttribute("width", Math.max(pw, 2)); p.setAttribute("y", Y0 + 24 + i * 138); p.setAttribute("height", i ? 104 : 118); p.setAttribute("opacity", pw > 8 ? 1 : 0); });
          knob.setAttribute("cx", hingeRight ? x + Math.min(20, w * 0.4) : x + w - Math.min(20, w * 0.4)); knob.setAttribute("opacity", seg(w, 60, 110));
          lead.setAttribute("opacity", seg(o, 0.7, 1));
          chips.forEach((c, i) => { const a = t0 + 1 + i * 0.4, k = ob(seg(t, a, a + 0.35)) * (1 - seg(t, 10.7, 10.9)); tf(c.g, vis, c.y, cl(k, 0, 1.3)); show(c.g, k); });
        };
      };
      const A = mk(50, false, "Hermes Agent", LIL, ["capped memory", "serverless backends"], 0.8);
      const B = mk(460, true, "OpenClaw", BLUE, ["the larger project", "native apps", "ClawHub"], 3.4);
      const X0 = 610, X1 = 190, PY = 462;
      const trail = el("path", { stroke: INK, "stroke-width": 2.5, "stroke-dasharray": "3 9", "stroke-linecap": "round", fill: "none" }, svg);
      const label = txt(svg, 400, 511, "hermes claw migrate", { "text-anchor": "middle", "font-family": MONO, "font-size": 20, "font-weight": 700 });
      const plane = el("g", {}, svg);
      el("path", { d: "M-30 2 L26 -18 L12 2 L22 16 Z", fill: YEL, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, plane);
      el("path", { d: "M-30 2 L12 2", stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round" }, plane);
      const cap = strip(svg, 528, 680);
      return (t) => {
        A(t); B(t);
        const p = io(seg(t, 6.6, 8.6)), out = seg(t, 10.7, 11.2), x = X0 + (X1 - X0) * p, y = PY - 6 * Math.sin(p * Math.PI * 3);
        tf(plane, x, y, 1, -Math.cos(p * Math.PI * 3) * 9);
        plane.setAttribute("opacity", seg(t, 6.4, 6.7) * (1 - out));
        trail.setAttribute("d", `M${X0 + 34} ${PY} H${Math.min(X0 + 34, x + 38)}`); trail.setAttribute("opacity", (p > 0.02 ? 1 : 0) * (1 - out));
        label.setAttribute("opacity", seg(t, 7.2, 7.7) * (1 - out));
        cap.textContent = t < 3.4 || t > 10.9 ? "Hermes Agent: a tight, capped memory or serverless backends" : t < 6.4 ? "OpenClaw: the larger project, native apps, or ClawHub" : "The Hermes docs describe an import from OpenClaw";
      };
    },
  };

  /* ---- title card, 16 by 9 ---- */
  SC.hero = {
    w: 960, h: 540, dur: 1, still: 0,
    build(svg) {
      txt(svg, 66, 92, "COMPARISON", { "font-family": MONO, "font-size": 22, "font-weight": 700, fill: MUTE, "letter-spacing": 3 });
      txt(svg, 64, 176, "Hermes Agent", { "font-size": 76, "font-weight": 700 });
      txt(svg, 64, 262, "vs OpenClaw", { "font-size": 76, "font-weight": 700 });
      el("path", { d: "M66 290 H520", stroke: YEL, "stroke-width": 14, "stroke-linecap": "round" }, svg);
      txt(svg, 64, 346, "Checked 7 Oct 2026", { "font-size": 25, "font-weight": 500, fill: MUTE });
      /* two tin cans on a string */
      el("path", { d: "M222 430 Q480 540 738 430", fill: "none", stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, svg);
      const can = (x, col, flip) => {
        const g = el("g", { transform: `translate(${x} 430) scale(${flip} 1) rotate(-14)` }, svg);
        el("rect", { x: -100, y: -40, width: 100, height: 80, fill: col, stroke: INK, "stroke-width": 3 }, g);
        el("ellipse", { cx: 0, cy: 0, rx: 13, ry: 40, fill: col, stroke: INK, "stroke-width": 3 }, g);
        el("ellipse", { cx: -100, cy: 0, rx: 13, ry: 40, fill: "#fff", stroke: INK, "stroke-width": 3 }, g);
        el("path", { d: "M-72 -40 V40 M-28 -40 V40", stroke: INK, "stroke-width": 2.5 }, g);
        el("circle", { cx: 6, cy: 0, r: 5, fill: INK }, g);
        [0, 1, 2].forEach((i) => el("path", { d: `M${-128 - i * 18} ${-16 - i * 8} Q${-140 - i * 20} 0 ${-128 - i * 18} ${16 + i * 8}`, fill: "none", stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, g));
      };
      can(222, LIL, 1); can(738, BLUE, -1);
      return () => {};
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
