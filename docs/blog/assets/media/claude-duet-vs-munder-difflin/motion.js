/* Bright coded scenes for "Claude Duet vs Munder Difflin". Vanilla JS, no library.
   <figure class="mg" data-scene="NAME"> holds a still image; this script swaps in a live SVG.
   Plays only in view, honours reduced motion, "?mgstill" freezes each scene on its still frame. */
(() => {
  const NS = "http://www.w3.org/2000/svg";
  const INK = "#1A1320", YEL = "#FFCA54", BLUE = "#6C8EF5", LIL = "#B69CFF", MINT = "#7FD8AE", SKY = "#9AD8FF", SOFT = "#F1ECF9", MUTE = "#7A6A88";
  const SKY_SOFT = "#DDF1FF", GREY = "#CAC3D2", DIM = "#4A3F57";
  const SANS = '"Space Grotesk", system-ui, sans-serif', MONO = '"JetBrains Mono", ui-monospace, monospace';
  const el = (t, a = {}, p) => { const n = document.createElementNS(NS, t); for (const k in a) n.setAttribute(k, a[k]); if (p) p.appendChild(n); return n; };
  const txt = (p, x, y, s, a = {}) => { const n = el("text", Object.assign({ x, y, "font-family": SANS, "font-size": 24, "font-weight": 600, fill: INK }, a), p); n.textContent = s; return n; };
  const fit = (n, max) => { const w = n.getComputedTextLength(); if (w > max) n.setAttribute("font-size", (+n.getAttribute("font-size") * max) / w); return n; };
  const cl = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const seg = (t, a, b) => cl((t - a) / (b - a));
  const oc = (x) => 1 - Math.pow(1 - x, 3);
  const ob = (x) => { const c = 1.70158; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
  const io = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const tf = (n, x, y, s = 1, r = 0) => n.setAttribute("transform", `translate(${x} ${y}) rotate(${r}) scale(${s})`);
  const hex = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
  const mix = (a, b, k) => { const A = hex(a), B = hex(b); return "#" + A.map((v, i) => Math.round(v + (B[i] - v) * cl(k)).toString(16).padStart(2, "0")).join(""); };
  /* a soft idle beat: 0 at rest, a smooth hump for the first w of each period P; always at rest when t = end */
  const bump = (t, end, P, d = 0, w = 0.5) => { if (!isFinite(t)) return 0; const u = ((((t - end - d) / P) % 1) + 1) % 1; return u < w ? Math.sin(Math.PI * u / w) : 0; };
  /* a squash and stretch wobble after a landing: k runs 0 to 1 */
  const squash = (k) => (k > 0 && k < 1 ? Math.sin(k * Math.PI * 2) * (1 - k) * 0.14 : 0);
  const button = (g, label, fn) => {
    g.setAttribute("role", "button"); g.setAttribute("tabindex", "0"); g.setAttribute("aria-label", label); g.classList.add("mg-hit");
    g.addEventListener("click", fn);
    g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); } });
  };
  const hint = (svg, s, x = 756, y = 50) => txt(svg, x, y, s, { "text-anchor": "end", "font-size": 16, fill: MUTE, "font-weight": 500 });
  /* a rounded token centred on its origin, sized to its label, with an optional coloured dot */
  const token = (p, label, fill, dot, fs = 17, h = 32) => {
    const g = el("g", {}, p), inner = el("g", {}, g);
    const halo = el("rect", { y: -h / 2, height: h, rx: h / 2, fill: "none", stroke: SKY, "stroke-width": 4, opacity: 0 }, inner);
    const r = el("rect", { y: -h / 2, height: h, rx: h / 2, fill, stroke: INK, "stroke-width": 2.5 }, inner);
    const padL = dot ? 30 : 15;
    const t = txt(inner, 0, fs * 0.36, label, { "font-size": fs, "font-weight": 700 });
    const w = Math.ceil(t.getComputedTextLength()) + padL + 15;
    t.setAttribute("x", -w / 2 + padL);
    [r, halo].forEach((n) => { n.setAttribute("x", -w / 2); n.setAttribute("width", w); });
    const d = dot ? el("circle", { cx: -w / 2 + 16, cy: 0, r: 6.5, fill: dot, stroke: INK, "stroke-width": 2 }, inner) : null;
    return { g, inner, halo, r, t, d, w, h };
  };
  /* a pill button with a dashed focus ring */
  const mkBtn = (p, label, fs = 18) => {
    const g = el("g", {}, p), body = el("g", {}, g);
    const r = el("rect", { y: -21, height: 42, rx: 21, fill: YEL, stroke: INK, "stroke-width": 2.5 }, body);
    const t = txt(body, 0, 6.5, label, { "text-anchor": "middle", "font-size": fs, "font-weight": 700 });
    const w = Math.ceil(t.getComputedTextLength()) + 44;
    r.setAttribute("x", -w / 2); r.setAttribute("width", w);
    el("rect", { x: -w / 2 - 6, y: -27, width: w + 12, height: 54, rx: 27, fill: "none", stroke: INK, "stroke-width": 2, "stroke-dasharray": "4 5", class: "mg-ring" }, body);
    return { g, body, r, w };
  };
  const dip = (k) => (k > 0 && k < 1 ? Math.sin(Math.PI * k) : 0);

  const SC = {};

  /* ---- title card, 16 by 9: one card in a cloud beside four typing terminals ---- */
  SC.hero = {
    w: 960, h: 540, dur: 10, still: 10,
    build(svg) {
      const END = 10;
      const pill = el("g", {}, svg);
      const pr = el("rect", { y: -20, height: 40, rx: 20, fill: YEL, stroke: INK, "stroke-width": 2.5 }, pill);
      const pt = txt(pill, 0, 7, "Versus", { "text-anchor": "middle", "font-size": 19, "font-weight": 700 });
      const pw = Math.ceil(pt.getComputedTextLength()) + 40;
      pr.setAttribute("x", -pw / 2); pr.setAttribute("width", pw);
      const l1g = el("g", {}, svg), l2g = el("g", {}, svg);
      const l1 = txt(l1g, 60, 194, "Claude Duet ", { "font-size": 68, "font-weight": 700 });
      el("tspan", { fill: MUTE }, l1).textContent = "vs";
      const l2 = txt(l2g, 60, 268, "Munder Difflin", { "font-size": 68, "font-weight": 700 });
      const TW = 400, tmax = Math.max(l1.getComputedTextLength(), l2.getComputedTextLength());
      if (tmax > TW) [l1, l2].forEach((n) => n.setAttribute("font-size", (68 * TW) / tmax));
      const UL = Math.round(l2.getComputedTextLength() * 0.62);
      const under = el("path", { d: `M66 292 H${66 + UL}`, stroke: YEL, "stroke-width": 14, "stroke-linecap": "round", fill: "none" }, svg);
      const s1g = el("g", {}, svg), s2g = el("g", {}, svg);
      const s1 = txt(s1g, 63, 342, "One agent in the cloud,", { "font-size": 26, "font-weight": 500, fill: MUTE });
      const s2 = txt(s2g, 63, 376, "or a team on your computer", { "font-size": 26, "font-weight": 500, fill: MUTE });
      const smax = Math.max(s1.getComputedTextLength(), s2.getComputedTextLength());
      if (smax > 418) [s1, s2].forEach((n) => n.setAttribute("font-size", (26 * 418) / smax));
      const chk = txt(svg, 64, 470, "Checked 22 Oct 2026", { "font-size": 18, "font-weight": 500, fill: MUTE });

      /* the cloud: an outline layer under a fill layer gives one merged shape */
      const cloudG = el("g", {}, svg), cS = el("g", {}, cloudG), cF = el("g", {}, cloudG);
      const SH = [["r", 500, 232, 156, 74, 37], ["c", 544, 236, 38], ["c", 598, 210, 50], ["c", 642, 240, 32]];
      const cloud = SH.map((s, i) => {
        const mk = (p, a) => s[0] === "r" ? el("rect", Object.assign({ x: s[1], y: s[2], width: s[3], height: s[4], rx: s[5] }, a), p) : el("circle", Object.assign({ cx: s[1], cy: s[2], r: s[3] }, a), p);
        return { a: mk(cS, { fill: INK, stroke: INK, "stroke-width": 6 }), b: mk(cF, { fill: SKY_SOFT }), cx: s[0] === "r" ? s[1] + s[3] / 2 : s[1], cy: s[0] === "r" ? s[2] + s[4] / 2 : s[2], i };
      });
      const card = el("g", {}, cloudG);
      el("rect", { x: -44, y: -31, width: 88, height: 62, rx: 10, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, card);
      const lines = [[-15, 58], [-2, 42], [11, 52]].map(([y, w]) => ({ n: el("rect", { x: -31, y: y - 3.5, width: w, height: 7, rx: 3.5, fill: GREY }, card), w }));

      /* the vs chip */
      const chip = el("g", {}, svg);
      el("circle", { r: 26, fill: YEL, stroke: INK, "stroke-width": 2.5 }, chip);
      txt(chip, 0, 7.5, "vs", { "text-anchor": "middle", "font-size": 22, "font-weight": 700 });

      /* four terminals */
      const defs = el("defs", {}, svg);
      const SEGS = [[[-22, 14], [-4, 20], [20, 8]], [[-22, 20], [2, 12], [18, 10]], [[-22, 10], [-8, 24], [20, 6]], [[-22, 16], [-2, 16], [18, 10]]];
      const COLS = [BLUE, LIL, MINT, SKY];
      const terms = [[792, 224], [890, 224], [792, 312], [890, 312]].map(([x, y], i) => {
        const g = el("g", {}, svg);
        el("rect", { x: -44, y: -38, width: 88, height: 76, rx: 10, fill: "#fff" }, g);
        el("path", { d: "M-44 -20 V-28 A10 10 0 0 1 -34 -38 H34 A10 10 0 0 1 44 -28 V-20 Z", fill: COLS[i] }, g);
        el("path", { d: "M-44 -20 H44", stroke: INK, "stroke-width": 2 }, g);
        [-33, -25, -17].forEach((cx) => el("circle", { cx, cy: -29, r: 2.8, fill: "#fff", stroke: INK, "stroke-width": 1.5 }, g));
        el("rect", { x: -44, y: -38, width: 88, height: 76, rx: 10, fill: "none", stroke: INK, "stroke-width": 2.5 }, g);
        el("path", { d: "M-33 3 L-27 9 L-33 15", stroke: INK, "stroke-width": 2.5, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, g);
        const cp = el("clipPath", { id: `mg-dvm-term${i}` }, defs);
        const wipe = el("rect", { x: -22, y: 0, width: 0, height: 18 }, cp);
        const typed = el("g", { "clip-path": `url(#mg-dvm-term${i})` }, g);
        SEGS[i].forEach(([sx, sw]) => el("rect", { x: sx, y: 5.5, width: sw, height: 7, rx: 3.5, fill: MUTE }, typed));
        const endX = SEGS[i][2][0] + SEGS[i][2][1];
        const cur = el("rect", { x: -20, y: 2.5, width: 5, height: 13, rx: 1, fill: INK }, g);
        return { g, wipe, cur, endX, x, y, at: 2.3 + i * 0.09, ts: 3.0 + i * 0.32 };
      });

      return (t) => {
        const a = ob(seg(t, 0.15, 0.6));
        tf(pill, 64 + pw / 2, 82, 0.6 + 0.4 * a); pill.setAttribute("opacity", seg(t, 0.15, 0.3));
        [l1g, l2g].forEach((g, i) => { const k = seg(t, 0.32 + i * 0.1, 0.92 + i * 0.1); tf(g, 0, 26 * (1 - oc(k))); g.setAttribute("opacity", seg(k, 0, 0.4)); });
        const ul = oc(seg(t, 0.85, 1.4)); under.setAttribute("stroke-dasharray", `${UL} ${UL + 20}`); under.setAttribute("stroke-dashoffset", UL * (1 - ul)); under.setAttribute("opacity", ul > 0 ? 1 : 0);
        [s1g, s2g].forEach((g, i) => { const k = seg(t, 0.62 + i * 0.09, 1.2 + i * 0.09); tf(g, 0, 16 * (1 - oc(k))); g.setAttribute("opacity", seg(k, 0, 0.5)); });
        chk.setAttribute("opacity", seg(t, 0.85, 1.25));

        const settle = seg(t, 4.4, 5.2);
        const bob = -5 * Math.sin((2 * Math.PI * (t - END)) / 3.4) * settle;
        cloudG.setAttribute("transform", `translate(0 ${bob})`);
        cloud.forEach((c) => {
          const k = c.i === 0 ? oc(seg(t, 0.95, 1.4)) : ob(seg(t, 1.05 + c.i * 0.09, 1.5 + c.i * 0.09));
          const tr = c.i === 0 ? `translate(${c.cx} ${c.cy}) scale(${0.7 + 0.3 * k} ${0.85 + 0.15 * k}) translate(${-c.cx} ${-c.cy})` : `translate(${c.cx} ${c.cy}) scale(${k}) translate(${-c.cx} ${-c.cy})`;
          [c.a, c.b].forEach((n) => { n.setAttribute("transform", tr); n.setAttribute("opacity", c.i === 0 ? seg(t, 0.95, 1.15) : k > 0 ? 1 : 0); });
        });
        const ce = seg(t, 1.5, 2.0);
        tf(card, 580, 262 - 34 * (1 - oc(ce)), 0.85 + 0.15 * ob(ce), -3 + 10 * (1 - ob(ce)) + 1.2 * Math.sin((2 * Math.PI * (t - END)) / 3.4 + 0.9) * settle);
        card.setAttribute("opacity", seg(ce, 0, 0.3));
        lines.forEach((L, j) => L.n.setAttribute("width", L.w * oc(seg(t, 1.9 + j * 0.1, 2.3 + j * 0.1))));

        const he = seg(t, 2.1, 2.55);
        tf(chip, 708, 266, ob(he) * (1 + 0.05 * bump(t, END, 2.2, 0.6, 0.4) * settle), -25 * (1 - ob(he)));
        chip.setAttribute("opacity", he > 0 ? 1 : 0);

        terms.forEach((T) => {
          const k = seg(t, T.at, T.at + 0.5);
          tf(T.g, T.x, T.y + 14 * (1 - oc(k)), 0.6 + 0.4 * ob(k));
          T.g.setAttribute("opacity", seg(k, 0, 0.3));
          const p = Math.floor(seg(t, T.ts, T.ts + 1.0) * 9) / 9, rx = -22 + p * (T.endX + 22);
          T.wipe.setAttribute("width", rx + 22);
          T.cur.setAttribute("x", p > 0 ? rx + 2 : -20);
          const typing = t >= T.ts && t < T.ts + 1.05;
          const on = typing || ((((t - END) / 0.9) % 1) + 1) % 1 < 0.55;
          T.cur.setAttribute("opacity", on ? 1 : 0);
        });
      };
    },
  };

  /* ---- 1. one ongoing thread beside a team that passes envelopes through a shared hive ---- */
  SC.team = {
    dur: 13, still: 13,
    build(svg, api) {
      const END = 13, ADD = 8.3;
      const tL = txt(svg, 48, 62, "Claude Duet", { "font-size": 26, "font-weight": 700 });
      const tR = txt(svg, 384, 62, "Munder Difflin", { "font-size": 26, "font-weight": 700 });
      const hintT = hint(svg, "Tap Add an agent", 772, 62);

      /* left: one tall thread */
      const colG = el("g", {}, svg);
      el("rect", { x: 48, y: 86, width: 290, height: 492, rx: 24, fill: SOFT }, colG);
      const lab = txt(svg, 72, 124, "One ongoing thread", { "font-size": 18, "font-weight": 700, fill: MUTE });
      const rr = (w, h, r, bl, br) => `M${r} 0 H${w - r} A${r} ${r} 0 0 1 ${w} ${r} V${h - br} A${br} ${br} 0 0 1 ${w - br} ${h} H${bl} A${bl} ${bl} 0 0 1 0 ${h - bl} V${r} A${r} ${r} 0 0 1 ${r} 0 Z`;
      const BUB = [[0, [118, 84]], [1, [96]], [0, [130]], [0, [124, 70]], [1, [88]], [0, [110, 128]], [1, [104]], [0, null]];
      let by = 142;
      const bubbles = BUB.map(([side, ls], i) => {
        const h = ls && ls.length > 1 ? 52 : 36, w = ls ? Math.max(...ls) + 40 : 78;
        const x = side ? 318 - w : 68, y = by; by += h + 10;
        const g = el("g", {}, svg);
        el("path", { d: rr(w, h, 15, side ? 15 : 4, side ? 4 : 15), fill: side ? BLUE : "#fff", stroke: INK, "stroke-width": 2.5 }, g);
        const dots = [];
        if (ls) ls.forEach((lw, j) => el("rect", { x: 20, y: (ls.length > 1 ? 15 + j * 15 : 14.5), width: lw, height: 7, rx: 3.5, fill: side ? "#fff" : GREY }, g));
        else [24, 39, 54].forEach((cx) => dots.push(el("circle", { cx, cy: 18, r: 4.5, fill: MUTE }, g)));
        return { g, x, y, w, h, side, dots, at: 0.9 + i * 0.82 };
      });

      /* right: tiles around a shared hive */
      const HC = [576, 330];
      const TILES = [["Claude Code", BLUE, 448, 196], ["Codex", LIL, 704, 196], ["Gemini CLI", MINT, 448, 466], ["OpenCode", SKY, 704, 466], ["Qwen Code", YEL, 576, 116]];
      const links = TILES.map(([, , x, y]) => el("path", { d: `M${x} ${y} L${HC[0]} ${HC[1]}`, stroke: GREY, "stroke-width": 3, "stroke-dasharray": "2 9", "stroke-linecap": "round" }, svg));
      const envL = el("g", {}, svg);
      const slot = el("g", {}, svg);
      el("rect", { x: -70, y: -33, width: 140, height: 66, rx: 12, fill: "#fff", stroke: MUTE, "stroke-width": 2, "stroke-dasharray": "6 6" }, slot);
      el("path", { d: "M-10 0 H10 M0 -10 V10", stroke: MUTE, "stroke-width": 3, "stroke-linecap": "round" }, slot);
      tf(slot, 576, 116);
      const burst = el("rect", { x: -70, y: -33, width: 140, height: 66, rx: 12, fill: "none", stroke: YEL, "stroke-width": 5, opacity: 0 }, svg);
      const tiles = TILES.map(([name, col, x, y]) => {
        const g = el("g", {}, svg), body = el("g", {}, g);
        el("rect", { x: -70, y: -33, width: 140, height: 66, rx: 12, fill: "#fff" }, body);
        el("path", { d: "M-70 -15 V-21 A12 12 0 0 1 -58 -33 H58 A12 12 0 0 1 70 -21 V-15 Z", fill: col }, body);
        el("path", { d: "M-70 -15 H70", stroke: INK, "stroke-width": 2 }, body);
        [-56, -47, -38].forEach((cx) => el("circle", { cx, cy: -24, r: 3, fill: "#fff", stroke: INK, "stroke-width": 1.5 }, body));
        el("rect", { x: -70, y: -33, width: 140, height: 66, rx: 12, fill: "none", stroke: INK, "stroke-width": 2.5 }, body);
        el("path", { d: "M-56 3 L-50 9 L-56 15", stroke: INK, "stroke-width": 2.5, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, body);
        fit(txt(body, -42, 15, name, { "font-size": 17, "font-weight": 700 }), 104);
        return { g, body, x, y, col };
      });
      const hive = el("g", {}, svg), hHalo = el("rect", { x: -86, y: -41, width: 172, height: 82, rx: 22, fill: "none", stroke: YEL, "stroke-width": 6, opacity: 0 }, hive);
      const hBody = el("g", {}, hive);
      el("rect", { x: -86, y: -41, width: 172, height: 82, rx: 22, fill: YEL, stroke: INK, "stroke-width": 3 }, hBody);
      const hx = (cx, cy, r) => "M" + [0, 1, 2, 3, 4, 5].map((k) => { const a = Math.PI / 6 + (k * Math.PI) / 3; return `${(cx + r * Math.cos(a)).toFixed(2)} ${(cy + r * Math.sin(a)).toFixed(2)}`; }).join(" L") + " Z";
      [-20, 0, 20].forEach((cx) => el("path", { d: hx(cx, -16, 8), fill: "#fff", stroke: INK, "stroke-width": 2, "stroke-linejoin": "round" }, hBody));
      txt(hBody, 0, 22, "Shared hive", { "text-anchor": "middle", "font-size": 21, "font-weight": 700 });

      /* envelopes: tile to hive, a beat inside, hive to tile */
      const mkEnv = () => {
        const g = el("g", { opacity: 0 }, envL);
        const body = el("rect", { x: -13, y: -9, width: 26, height: 18, rx: 3, fill: "#fff", stroke: INK, "stroke-width": 2 }, g);
        el("path", { d: "M-13 -9 L0 1.5 L13 -9", stroke: INK, "stroke-width": 2, fill: "none", "stroke-linejoin": "round" }, g);
        return { g, body };
      };
      const AUTO = [[2.5, 0, 2], [3.2, 1, 3], [3.9, 3, 0], [4.6, 2, 1], [5.3, 0, 3], [6.0, 1, 2], [6.7, 3, 1], [7.95, 2, 4], [8.9, 4, 0], [9.6, 1, 3], [10.3, 3, 4], [10.8, 2, 1], [11.5, 0, 3], [12.575, 4, 2]]
        .map(([at, from, to]) => Object.assign(mkEnv(), { at, from, to }));
      const pool = [0, 1, 2, 3].map(mkEnv);
      const FLY = 1.9, IN = 0.85, OUT = 1.05;
      const place = (E, u) => {
        if (u < 0 || u > FLY || (u >= IN && u < OUT)) { E.g.setAttribute("opacity", 0); return; }
        const A = u < IN ? [tiles[E.from].x, tiles[E.from].y] : HC, B = u < IN ? HC : [tiles[E.to].x, tiles[E.to].y];
        const q = u < IN ? u / IN : (u - OUT) / (FLY - OUT), p = 0.75 * q + 0.25 * io(q);
        const x = A[0] + (B[0] - A[0]) * p, y = A[1] + (B[1] - A[1]) * p;
        tf(E.g, x, y, 0.85 + 0.2 * Math.sin(Math.PI * p), 8 * Math.sin(Math.PI * 2 * p));
        E.body.setAttribute("fill", tiles[E.from].col);
        E.g.setAttribute("opacity", 1);
      };

      const btn = mkBtn(svg, "Add an agent");
      let qAt = null, bounceAt = -99, press = -99, manual = [], lastT = 0;
      button(btn.g, "Add an agent", () => {
        const now = api.now();
        if (qAt === null && lastT < ADD) qAt = now; else bounceAt = now;
        const E = pool[manual.length % pool.length];
        manual.push(Object.assign(E, { at: now, from: [1, 3, 0, 2][manual.length % 4], to: 4 }));
        if (manual.length > pool.length) manual = manual.slice(-pool.length);
        press = now; api.poke();
      });

      return (t, now) => {
        if (t < lastT - 0.5) { qAt = null; bounceAt = -99; manual = []; pool.forEach((E) => E.g.setAttribute("opacity", 0)); }
        lastT = t;
        const calm = api.calm;
        [tL, tR].forEach((n, i) => { const k = seg(t, 0.15 + i * 0.1, 0.6 + i * 0.1); n.setAttribute("opacity", seg(k, 0, 0.5)); n.setAttribute("transform", `translate(0 ${14 * (1 - oc(k))})`); });
        hintT.setAttribute("opacity", seg(t, 2.0, 2.4));
        const ck = seg(t, 0.25, 0.75); colG.setAttribute("opacity", seg(ck, 0, 0.5)); colG.setAttribute("transform", `translate(0 ${20 * (1 - oc(ck))})`);
        lab.setAttribute("opacity", seg(t, 0.5, 0.9));
        const settle = seg(t, 7.4, 7.9);
        bubbles.forEach((B) => {
          const k = seg(t, B.at, B.at + 0.5), e = ob(k), ox = B.side ? B.w : 0;
          B.g.setAttribute("transform", `translate(${B.x + ox} ${B.y + B.h + 16 * (1 - oc(k))}) scale(${0.6 + 0.4 * e}) translate(${-ox} ${-B.h})`);
          B.g.setAttribute("opacity", seg(k, 0, 0.3));
          B.dots.forEach((d, j) => { const p = bump(t, END, 1.3, j * 0.16, 0.42) * settle; d.setAttribute("cy", 18 - 3.5 * p); d.setAttribute("opacity", 0.55 + 0.45 * p); });
        });

        /* Qwen Code: added by the autoplay at ADD, or by a tap */
        const qk = qAt !== null ? (calm ? 1 : seg(now - qAt, 0, 0.5)) : seg(t, ADD, ADD + 0.5);
        const bk = calm ? 0 : seg(now - bounceAt, 0, 0.45);
        const live = (i) => (i < 4 ? 1 : qk);
        links.forEach((n, i) => n.setAttribute("opacity", i < 4 ? seg(t, 1.35 + i * 0.09, 1.7 + i * 0.09) : seg(qk, 0.4, 1)));
        slot.setAttribute("opacity", seg(t, 1.7, 2.1) * (1 - seg(qk, 0, 0.35)));
        const pk = qAt !== null ? (calm ? 1 : seg(now - qAt, 0.05, 0.6)) : seg(t, ADD + 0.05, ADD + 0.6);
        const burstK = Math.max(pk < 1 ? pk : 0, bk < 1 ? bk : 0);
        burst.setAttribute("transform", `translate(576 116) scale(${1 + 0.35 * burstK})`); burst.setAttribute("opacity", burstK > 0 && burstK < 1 ? 1 - burstK : 0);

        /* arrivals make the receiving tile hop, entries make the hive glow */
        const hop = [0, 0, 0, 0, 0]; let glow = 0;
        const note = (E, u) => {
          const a = seg(u, FLY, FLY + 0.4); if (a > 0 && a < 1) hop[E.to] = Math.max(hop[E.to], Math.sin(Math.PI * a));
          const g = seg(u, IN, IN + 0.55); if (g > 0 && g < 1) glow = Math.max(glow, 1 - g);
        };
        AUTO.forEach((E) => {
          const u = t - E.at, ok = live(E.from) >= 1 && (u < OUT || live(E.to) >= 1);
          if (!ok) { E.g.setAttribute("opacity", 0); return; }
          place(E, u); note(E, u);
        });
        manual.forEach((E) => { if (calm) return E.g.setAttribute("opacity", 0); const u = now - E.at; place(E, u); note(E, u); });
        tiles.forEach((T, i) => {
          if (i < 4) {
            const k = seg(t, 1.0 + i * 0.1, 1.5 + i * 0.1);
            tf(T.g, T.x, T.y + 16 * (1 - oc(k)), (0.6 + 0.4 * ob(k)) * (1 + 0.07 * hop[i]));
            T.g.setAttribute("opacity", seg(k, 0, 0.3));
          } else {
            tf(T.g, T.x, T.y, (0.3 + 0.7 * ob(qk)) * (1 + 0.07 * hop[i] + 0.12 * dip(bk)));
            T.g.setAttribute("opacity", seg(qk, 0, 0.25));
          }
        });
        const he = seg(t, 0.8, 1.3);
        tf(hive, HC[0], HC[1], (0.5 + 0.5 * ob(he)) * (1 + 0.035 * glow));
        hive.setAttribute("opacity", seg(he, 0, 0.3));
        hHalo.setAttribute("opacity", glow * 0.9); hHalo.setAttribute("transform", `scale(${1 + 0.12 * (1 - glow)} ${1 + 0.3 * (1 - glow)})`);

        const be = seg(t, 1.9, 2.35), pd = calm ? 0 : dip(seg(now, press, press + 0.3));
        tf(btn.g, 576, 560 + 14 * (1 - ob(be))); btn.g.setAttribute("opacity", seg(be, 0, 0.4));
        btn.body.setAttribute("transform", `translate(0 ${3 * pd}) scale(${1 - 0.05 * pd})`);
      };
    },
  };

  /* ---- 2. two belts: a gate for your approval, and an orchestrator with an approvals queue and a breaker ---- */
  SC.leash = {
    dur: 14, still: 14,
    build(svg, api) {
      const END = 14, GX = 600, Y1 = 111, Y2 = 453, V1 = 250, V2 = 230, LOOP = 7.8, LIFT = 465, X0 = 46;
      const tTop = txt(svg, 40, 50, "Claude Duet", { "font-size": 24, "font-weight": 700 });
      const gLab = txt(svg, GX, 50, "Your approval", { "text-anchor": "middle", "font-size": 17, "font-weight": 700 });
      const divider = el("path", { d: "M40 186 H760", stroke: SOFT, "stroke-width": 3, "stroke-linecap": "round" }, svg);
      const tBot = txt(svg, 40, 232, "Munder Difflin", { "font-size": 24, "font-weight": 700 });

      const belt = (x0, x1, y) => {
        const g = el("g", {}, svg);
        el("rect", { x: x0, y, width: x1 - x0, height: 20, rx: 10, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, g);
        const run = el("path", { d: `M${x0 + 20} ${y + 10} H${x1 - 20}`, stroke: GREY, "stroke-width": 3, "stroke-dasharray": "10 12", "stroke-linecap": "round" }, g);
        const rollers = [x0 + 10, x1 - 10].map((x) => { const r = el("g", {}, g); el("circle", { r: 6, fill: "#fff", stroke: INK, "stroke-width": 2 }, r); el("path", { d: "M-4 0 H4", stroke: INK, "stroke-width": 2, "stroke-linecap": "round" }, r); return { r, x, y: y + 10 }; });
        return { g, run, rollers };
      };
      const b1 = belt(40, 770, 128), b2 = belt(40, 700, 470);

      /* tray, lift lane and breaker sit behind the tokens */
      const tray = el("g", {}, svg);
      el("rect", { x: 352, y: 248, width: 226, height: 164, rx: 18, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, tray);
      txt(tray, LIFT, 277, "Approvals queue", { "text-anchor": "middle", "font-size": 17, "font-weight": 700 });
      const lane = el("path", { d: `M${LIFT - 8} 432 L${LIFT} 424 L${LIFT + 8} 432 M${LIFT - 8} 422 L${LIFT} 414 L${LIFT + 8} 422`, stroke: GREY, "stroke-width": 3, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, svg);

      const brk = el("g", {}, svg);
      txt(brk, 770, 268, "Circuit breaker", { "text-anchor": "end", "font-size": 17, "font-weight": 700 });
      el("rect", { x: 744, y: 408, width: 8, height: 82, fill: INK }, brk);
      el("rect", { x: 730, y: 486, width: 36, height: 8, rx: 4, fill: INK }, brk);
      el("rect", { x: 728, y: 284, width: 40, height: 126, rx: 12, fill: INK }, brk);
      const LAMPS = [["Steer", YEL, 314], ["Constrain", LIL, 347], ["Stop", BLUE, 380]].map(([s, c, y]) => {
        const halo = el("circle", { cx: 748, cy: y, r: 12, fill: "none", stroke: c, "stroke-width": 4, opacity: 0 }, brk);
        const lamp = el("circle", { cx: 748, cy: y, r: 11, fill: DIM, stroke: INK, "stroke-width": 2 }, brk);
        const lb = txt(brk, 716, y + 6, s, { "text-anchor": "end", "font-size": 16, "font-weight": 700, fill: MUTE });
        return { halo, lamp, lb, c };
      });

      /* the gate: rails and bar behind the tokens so open passes stay readable */
      const gate = el("g", {}, svg);
      el("path", { d: `M${GX - 13} 74 V126 M${GX + 13} 74 V126`, stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round" }, gate);
      const bar = el("g", {}, gate);
      el("rect", { x: GX - 8, y: 74, width: 16, height: 52, rx: 4, fill: LIL, stroke: INK, "stroke-width": 2.5 }, bar);
      el("path", { d: `M${GX - 8} 91 H${GX + 8} M${GX - 8} 108 H${GX + 8}`, stroke: INK, "stroke-width": 2 }, bar);
      el("rect", { x: GX - 19, y: 62, width: 38, height: 13, rx: 4, fill: INK }, gate);

      /* the orchestrator: a box on two legs over the bottom belt, so tokens ride through under it */
      const orch = el("g", {}, svg);
      [176, 296].forEach((x) => el("rect", { x, y: 426, width: 8, height: 46, rx: 2, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, orch));
      el("path", { d: "M240 390 V379", stroke: INK, "stroke-width": 2.5 }, orch);
      const ant = el("circle", { cx: 240, cy: 373, r: 7, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, orch);
      el("rect", { x: 166, y: 390, width: 148, height: 42, rx: 13, fill: BLUE, stroke: INK, "stroke-width": 3 }, orch);
      fit(txt(orch, 240, 417, "Orchestrator", { "text-anchor": "middle", "font-size": 17, "font-weight": 700 }), 128);

      /* tokens */
      const topL = el("g", {}, svg), botL = el("g", {}, svg);
      const FREE = ["Read", "Draft", "Prepare"].map((s, i) => Object.assign(token(topL, s, MINT), { s0: 0.9 + i * 0.7 }));
      const GATED = ["Send", "Pay", "Sign", "Delete"].map((s, i) => Object.assign(token(topL, s, YEL), { s0: 3.0 + i * 0.65 }));
      { let edge = GX - 17; GATED.forEach((k) => { k.stop = edge - k.w / 2; edge -= k.w + 8; }); }
      const SLOT = [311, 348, 385];
      let ri = 0;
      const BOT = [["Routine request", 0.9], ["Spend", 1.55], ["Routine request", 2.55], ["Scope change", 3.45], ["Routine request", 4.45], ["Destructive step", 5.5], ["Routine request", 12.09]].map(([s, s0]) => {
        const risky = s !== "Routine request";
        const k = Object.assign(token(botL, s, risky ? YEL : MINT), { s0, risky });
        if (risky) k.slot = ri++;
        return k;
      });
      const loopT = token(botL, "Looping agent", "#fff", LIL);

      /* controls */
      const btn = mkBtn(svg, "Send a looping agent", 17);
      const hintT = hint(svg, "Tap to send a looping agent", 40, 344);
      hintT.setAttribute("text-anchor", "start");
      let press = -99;
      button(btn.g, "Send a looping agent", () => { press = api.now(); api.seek(LOOP - 0.05); });

      /* the loop: start on the lower run at x 400, go left, up, along the top, down past the breaker, and back */
      const R = 40, LL = 880 + 2 * Math.PI * R, D = 3 * LL, APEX = 680 + 1.5 * Math.PI * R, RUN = 4.3, PW = 1.8;
      const P = (s) => {
        s = ((s % LL) + LL) % LL;
        if (s < 240) return [400 - s, 533];
        s -= 240; if (s < Math.PI * R) { const a = Math.PI / 2 + s / R; return [160 + R * Math.cos(a), 493 + R * Math.sin(a)]; }
        s -= Math.PI * R; if (s < 440) return [160 + s, 453];
        s -= 440; if (s < Math.PI * R) { const a = -Math.PI / 2 + s / R; return [600 + R * Math.cos(a), 493 + R * Math.sin(a)]; }
        s -= Math.PI * R; return [600 - s, 533];
      };
      const LAMP_AT = [0, 1, 2].map((k) => 0.35 + RUN * (1 - Math.pow(1 - (APEX + k * LL) / D, 1 / PW)));

      const ride = (t, s, x0, x1, v) => {
        const TAU = 0.35, dd = (v * TAU) / 2, T1 = (x1 - x0 - dd) / v, dt = t - s;
        if (dt < T1) return [x0 + v * dt, s + T1 + TAU];
        const k = cl((dt - T1) / TAU);
        return [x1 - dd * (1 - k) * (1 - k), s + T1 + TAU];
      };
      /* a token drops onto the start of a belt with a pop, then rides; returns its left edge offset */
      const spawn = (k, t, y) => { const e = seg(t, k.s0 - 0.25, k.s0); return { s: 0.4 + 0.6 * ob(e), dy: -22 * (1 - oc(e)), op: seg(e, 0, 0.4) }; };
      const sq = (k, n) => { const q = squash(k); n.inner.setAttribute("transform", `translate(0 ${n.h / 2}) scale(${1 + q} ${1 - q}) translate(0 ${-n.h / 2})`); };

      return (t, now) => {
        const calm = api.calm;
        [tTop, gLab, tBot].forEach((n, i) => n.setAttribute("opacity", seg(t, 0.15 + i * 0.1, 0.5 + i * 0.1)));
        divider.setAttribute("opacity", seg(t, 0.3, 0.6));
        [b1, b2].forEach((b, i) => {
          const k = seg(t, 0.2 + i * 0.12, 0.75 + i * 0.12);
          b.g.setAttribute("opacity", seg(k, 0, 0.4)); b.g.setAttribute("transform", `translate(${-30 * (1 - oc(k))} 0)`);
          const v = i ? V2 : V1;
          b.run.setAttribute("stroke-dashoffset", -((t * v) % 22));
          b.rollers.forEach((r) => tf(r.r, r.x, r.y, 1, ((t * v) / 6) * (180 / Math.PI)));
        });
        const ge = seg(t, 0.4, 0.8); gate.setAttribute("opacity", seg(ge, 0, 0.4)); gate.setAttribute("transform", `translate(0 ${-14 * (1 - oc(ge))})`);
        const shut = ob(seg(t, 4.65, 5.0)), hgt = 0.12 + 0.88 * shut;
        bar.setAttribute("transform", `translate(0 74) scale(1 ${hgt}) translate(0 -74)`);
        const te = seg(t, 0.55, 1.0); tray.setAttribute("opacity", seg(te, 0, 0.4)); tray.setAttribute("transform", `translate(0 ${16 * (1 - oc(te))})`);
        lane.setAttribute("opacity", seg(t, 0.9, 1.2));
        const ke = seg(t, 0.65, 1.1); brk.setAttribute("opacity", seg(ke, 0, 0.4)); brk.setAttribute("transform", `translate(${20 * (1 - oc(ke))} 0)`);
        const oe = seg(t, 0.5, 0.95); orch.setAttribute("opacity", seg(oe, 0, 0.3)); orch.setAttribute("transform", `translate(240 448) scale(${0.7 + 0.3 * ob(oe)}) translate(-240 -448)`);
        const be = seg(t, 1.0, 1.45), pd = calm ? 0 : dip(seg(now, press, press + 0.3));
        tf(btn.g, 40 + btn.w / 2, 292 + 14 * (1 - ob(be))); btn.g.setAttribute("opacity", seg(be, 0, 0.4));
        btn.body.setAttribute("transform", `translate(0 ${3 * pd}) scale(${1 - 0.05 * pd})`);
        hintT.setAttribute("opacity", seg(t, 1.3, 1.7));

        /* top belt */
        FREE.forEach((k) => {
          const x = X0 + k.w / 2 + V1 * Math.max(0, t - k.s0), sp = spawn(k, t), off = seg(x, 712, 768);
          tf(k.g, x, Y1 + sp.dy + 20 * off * off, sp.s, 14 * off * off); k.g.setAttribute("opacity", sp.op * (1 - off));
        });
        const wait = seg(t, 6.6, 7.0);
        GATED.forEach((k, i) => {
          const [x, ta] = ride(Math.max(t, k.s0), k.s0, X0 + k.w / 2, k.stop, V1), sp = spawn(k, t);
          const nud = bump(t, END, 2.4, i * 0.12, 0.35) * wait;
          tf(k.g, x + 4 * nud, Y1 + sp.dy, sp.s); k.g.setAttribute("opacity", sp.op);
          sq(seg(t, ta, ta + 0.4), k);
        });

        /* bottom belt */
        let antC = null;
        BOT.forEach((k) => {
          const x0 = X0 + k.w / 2, xl = x0 + V2 * Math.max(0, t - k.s0), sp = spawn(k, t);
          if (t < k.s0 - 0.25) { k.g.setAttribute("opacity", 0); return; }
          if (!k.risky) {
            const off = seg(xl, 590, 650);
            tf(k.g, xl, Y2 + sp.dy, sp.s * (1 - 0.12 * off)); k.g.setAttribute("opacity", sp.op * (1 - off));
            if (xl > 166 && xl < 314) antC = MINT;
            return;
          }
          const ta = k.s0 + (LIFT - x0) / V2, lk = seg(t, ta, ta + 0.6);
          const x = Math.min(xl, LIFT), y = Y2 + sp.dy + (SLOT[k.slot] - Y2) * ob(lk);
          tf(k.g, x, y, sp.s); k.g.setAttribute("opacity", sp.op);
          sq(seg(t, ta + 0.45, ta + 0.85), k);
          if (x > 166 && x < 314) antC = YEL;
        });
        ant.setAttribute("fill", antC || "#fff");

        /* the looping agent and the breaker */
        const r = t - LOOP;
        const mv = seg(r, 0.35, 0.35 + RUN), d = D * (1 - Math.pow(1 - mv, PW));
        const [lx, ly] = P(d);
        const pop = ob(seg(r, 0, 0.35)), park = seg(r, 0.35 + RUN, 0.35 + RUN + 0.45);
        tf(loopT.g, lx, ly, r < 0 ? 0 : 0.3 + 0.7 * pop); loopT.g.setAttribute("opacity", r < 0 ? 0 : 1);
        sq(park, loopT);
        loopT.d.setAttribute("fill", mix(LIL, BLUE, park));
        LAMPS.forEach((L, k) => {
          const on = seg(r, LAMP_AT[k], LAMP_AT[k] + 0.2), fl = seg(r, LAMP_AT[k], LAMP_AT[k] + 0.6);
          const pulse = bump(t, END, 2.2, k * 0.25, 0.5) * seg(r, LAMP_AT[2] + 0.8, LAMP_AT[2] + 1.2);
          L.lamp.setAttribute("fill", mix(DIM, L.c, on));
          L.lb.setAttribute("fill", mix(MUTE, INK, on));
          const ho = fl > 0 && fl < 1 ? 1 - fl : 0.6 * pulse;
          L.halo.setAttribute("r", fl > 0 && fl < 1 ? 12 + 14 * oc(fl) : 12 + 6 * pulse); L.halo.setAttribute("opacity", ho);
        });
      };
    },
  };

  /* ---- 3. one shared plan bar against per agent budgets ---- */
  SC.limits = {
    dur: 12, still: 12,
    build(svg, api) {
      const END = 12;
      const hintT = hint(svg, "Drag the slider", 756, 50);
      const pL = el("rect", { x: 40, y: 78, width: 300, height: 440, rx: 24, fill: SOFT }, svg);
      const pR = el("rect", { x: 368, y: 78, width: 392, height: 440, rx: 24, fill: SOFT }, svg);
      const tL = txt(svg, 64, 122, "Claude Duet", { "font-size": 26, "font-weight": 700 });
      const tR = txt(svg, 392, 122, "Munder Difflin", { "font-size": 26, "font-weight": 700 });

      /* left: one plan bar */
      const planL = txt(svg, 64, 196, "Your Claude plan", { "font-size": 20, "font-weight": 700 });
      const B = { x: 64, y: 214, w: 252, h: 84 };
      const defs = el("defs", {}, svg), cp = el("clipPath", { id: "mg-dvm-plan" }, defs);
      el("rect", { x: B.x, y: B.y, width: B.w, height: B.h, rx: 20 }, cp);
      const track = el("rect", { x: B.x, y: B.y, width: B.w, height: B.h, rx: 20, fill: "#fff" }, svg);
      const fillG = el("g", { "clip-path": "url(#mg-dvm-plan)" }, svg);
      const CH = 0.32 * B.w, BC = 0.05 * B.w, LT = 0.24 * B.w;
      const chats = el("rect", { x: B.x - 3, y: B.y - 3, width: 0, height: B.h + 6, fill: BLUE, stroke: INK, "stroke-width": 2.5 }, fillG);
      const checks = [0, 1, 2, 3].map((i) => el("rect", { x: B.x + CH + i * BC, y: B.y - 3, width: BC, height: B.h + 6, fill: SKY, stroke: INK, "stroke-width": 2.5 }, fillG));
      const large = el("rect", { x: 0, y: B.y - 3, width: LT, height: B.h + 6, fill: LIL, stroke: INK, "stroke-width": 2.5 }, fillG);
      const cps = el("clipPath", { id: "mg-dvm-shine" }, defs), shineClip = el("rect", { x: B.x, y: B.y, width: 0, height: B.h }, cps);
      const shine = el("path", { d: `M0 ${B.y} h22 l-30 ${B.h} h-22 Z`, fill: "#fff", opacity: 0, "clip-path": "url(#mg-dvm-shine)" }, svg);
      const outline = el("rect", { x: B.x, y: B.y, width: B.w, height: B.h, rx: 20, fill: "none", stroke: INK, "stroke-width": 3 }, svg);
      const legend = [[BLUE, "Chats"], [SKY, "Background checks"], [LIL, "Large tasks"]].map(([c, s], i) => {
        const g = el("g", {}, svg);
        el("rect", { x: 64, y: 337 + i * 46, width: 24, height: 24, rx: 7, fill: c, stroke: INK, "stroke-width": 2.5 }, g);
        fit(txt(g, 102, 356 + i * 46, s, { "font-size": 21, "font-weight": 600 }), 214);
        return g;
      });

      /* right: a slider and four budget bars */
      const runL = txt(svg, 392, 176, "Agents running", { "font-size": 20, "font-weight": 700 });
      const A = 580, Bx = 728, SY = 170, STEP = (Bx - A) / 3;
      const sl = el("g", {}, svg);
      const hit = el("rect", { x: A - 26, y: SY - 26, width: Bx - A + 52, height: 52, fill: "#fff", "fill-opacity": 0 }, sl);
      el("path", { d: `M${A} ${SY} H${Bx}`, stroke: INK, "stroke-width": 16, "stroke-linecap": "round" }, sl);
      el("path", { d: `M${A} ${SY} H${Bx}`, stroke: "#fff", "stroke-width": 11, "stroke-linecap": "round" }, sl);
      const sFill = el("path", { d: `M${A} ${SY} H${A}`, stroke: YEL, "stroke-width": 11, "stroke-linecap": "round" }, sl);
      const nums = [1, 2, 3, 4].map((n, i) => txt(sl, A + i * STEP, SY + 39, String(n), { "text-anchor": "middle", "font-family": MONO, "font-size": 16, "font-weight": 700, fill: MUTE }));
      const knob = el("g", { role: "slider", tabindex: "0", "aria-label": "Agents running", "aria-valuemin": 1, "aria-valuemax": 4, class: "mg-hit" }, sl);
      el("circle", { r: 24, fill: "#fff", "fill-opacity": 0 }, knob);
      el("circle", { r: 13, fill: "#fff", stroke: INK, "stroke-width": 3 }, knob);
      el("circle", { r: 20, fill: "none", stroke: INK, "stroke-width": 2, "stroke-dasharray": "4 4", class: "mg-ring" }, knob);

      const ROW = [262, 338, 414, 490], X0 = 474, BW = 262;
      const CAP = [0.78, 0.46, 0.86, 0.66], FIN = [0.6, 0.46, 0.55, 0.38], APPEAR = [1.0, 1.6, 2.0, 2.4];
      const rows = ROW.map((y, i) => {
        const g = el("g", {}, svg);
        txt(g, 392, y + 7, `Agent ${i + 1}`, { "font-size": 18, "font-weight": 700 });
        el("rect", { x: X0, y: y - 10, width: BW, height: 20, rx: 10, fill: "#fff" }, g);
        const cpi = el("clipPath", { id: `mg-dvm-row${i}` }, defs);
        el("rect", { x: X0, y: y - 10, width: BW, height: 20, rx: 10 }, cpi);
        const bar = el("rect", { x: X0 - 3, y: y - 13, width: 0, height: 26, fill: MINT, stroke: INK, "stroke-width": 2, "clip-path": `url(#mg-dvm-row${i})` }, g);
        el("rect", { x: X0, y: y - 10, width: BW, height: 20, rx: 10, fill: "none", stroke: INK, "stroke-width": 2.5 }, g);
        const cx = X0 + CAP[i] * BW;
        el("path", { d: `M${cx} ${y - 17} V${y + 17}`, stroke: INK, "stroke-width": 2.5, "stroke-dasharray": "4 4" }, g);
        txt(g, cx, y - 22, "Budget", { "text-anchor": "middle", "font-size": 16, "font-weight": 600, fill: MUTE });
        const tip = el("circle", { cy: y, r: 4, fill: "#fff", stroke: INK, "stroke-width": 2, opacity: 0 }, g);
        const flash = el("circle", { cx, cy: y, r: 8, fill: "none", stroke: YEL, "stroke-width": 4, opacity: 0 }, g);
        return { g, bar, tip, flash, y, cx };
      });
      const tag = token(svg, "Stopped at budget", "#fff", YEL, 16, 28);
      const HIT = 2.0 + CAP[1] / 0.16;
      const fillAt = (i, t) => {
        if (i === 1) return Math.min(CAP[1], 0.16 * Math.max(0, t - 2.0));
        const s = [1.6, 0, 2.4, 2.8][i], u = seg(t, s, 11.6);
        return FIN[i] * (1 - Math.pow(1 - u, 1.5));
      };
      const muted = fit(txt(svg, 564, 558, "Uses the subscriptions you already pay for", { "text-anchor": "middle", "font-size": 19, "font-weight": 500, fill: MUTE }), 380);

      /* slider state: null follows the autoplay, a number is the viewer's own count */
      let user = null, lastT = 0, down = false, drag = null;
      const vis = [0, 0, 0, 0].map(() => ({ on: false, at: -99 }));
      const setN = (n, now) => { user = n; vis.forEach((v, i) => { const on = i < n; if (v.on !== on) { v.on = on; v.at = now; } }); api.poke(); };
      const first = () => { if (user === null) { const n = Math.round(1 + 3 * autoV(lastT)); vis.forEach((v, i) => { v.on = i < n; v.at = -99; }); user = n; } };
      const autoV = (t) => (io(seg(t, 1.3, 1.6)) + io(seg(t, 1.7, 2.0)) + io(seg(t, 2.1, 2.4))) / 3;
      const fromX = (e) => { const r = svg.getBoundingClientRect(); return cl((((e.clientX - r.left) / r.width) * 800 - A) / (Bx - A)); };
      const dragTo = (e) => { first(); drag = fromX(e); setN(Math.round(1 + 3 * drag), api.now()); };
      [knob, hit].forEach((n) => n.addEventListener("pointerdown", (e) => { down = true; try { knob.setPointerCapture(e.pointerId); } catch (_) {} dragTo(e); knob.focus && knob.focus({ preventScroll: true }); }));
      knob.addEventListener("pointermove", (e) => { if (down) dragTo(e); });
      const up = () => { down = false; drag = null; api.poke(); };
      knob.addEventListener("pointerup", up); knob.addEventListener("pointercancel", up);
      knob.addEventListener("keydown", (e) => {
        const k = e.key, cur = user === null ? Math.round(1 + 3 * autoV(lastT)) : user;
        const n = k === "ArrowRight" || k === "ArrowUp" ? cur + 1 : k === "ArrowLeft" || k === "ArrowDown" ? cur - 1 : k === "Home" ? 1 : k === "End" ? 4 : null;
        if (n === null) return;
        e.preventDefault(); first(); setN(Math.max(1, Math.min(4, n)), api.now());
      });

      return (t, now) => {
        if (t < lastT - 0.5 && !down) user = null;
        lastT = t;
        const calm = api.calm;
        [pL, pR].forEach((n, i) => { const k = seg(t, 0.1 + i * 0.1, 0.55 + i * 0.1); n.setAttribute("opacity", seg(k, 0, 0.4)); n.setAttribute("transform", `translate(0 ${18 * (1 - oc(k))})`); });
        [tL, tR].forEach((n, i) => n.setAttribute("opacity", seg(t, 0.3 + i * 0.1, 0.65 + i * 0.1)));
        hintT.setAttribute("opacity", seg(t, 2.6, 3.0));
        planL.setAttribute("opacity", seg(t, 0.5, 0.85));
        const bk = seg(t, 0.6, 1.05);
        [track, outline].forEach((n) => { n.setAttribute("opacity", seg(bk, 0, 0.4)); n.setAttribute("transform", `translate(${B.x} ${B.y + B.h / 2}) scale(${0.85 + 0.15 * ob(bk)}) translate(${-B.x} ${-B.y - B.h / 2})`); });
        fillG.setAttribute("opacity", bk > 0.5 ? 1 : 0);
        legend.forEach((g, i) => { const k = seg(t, 0.8 + i * 0.09, 1.25 + i * 0.09); g.setAttribute("opacity", seg(k, 0, 0.4)); g.setAttribute("transform", `translate(${-16 * (1 - oc(k))} 0)`); });
        chats.setAttribute("width", 3 + CH * oc(seg(t, 1.2, 2.4)));
        checks.forEach((c, i) => { const k = seg(t, 2.7 + i * 0.6, 3.15 + i * 0.6); c.setAttribute("transform", `translate(0 ${-(B.h + 10) * (1 - ob(k))})`); c.setAttribute("opacity", k > 0 ? 1 : 0); });
        const lk = seg(t, 5.3, 6.2), lx = B.x + CH + 4 * BC;
        large.setAttribute("x", B.x + B.w + 6 + (lx - B.x - B.w - 6) * ob(lk));
        const filled = CH + 4 * BC + LT, sh = seg(t, 7.0, 7.4);
        shineClip.setAttribute("width", filled);
        const su = ((((t - END) / 3.2) % 1) + 1) % 1;
        shine.setAttribute("transform", `translate(${B.x - 10 + su * 2 * (filled + 40)} 0)`);
        shine.setAttribute("opacity", su < 0.5 ? 0.45 * Math.sin(su * 2 * Math.PI) * sh : 0);

        runL.setAttribute("opacity", seg(t, 0.6, 0.95));
        const se = seg(t, 0.7, 1.15); sl.setAttribute("opacity", seg(se, 0, 0.4)); sl.setAttribute("transform", `translate(${16 * (1 - oc(se))} 0)`);
        const v = drag !== null ? drag : user !== null ? (user - 1) / 3 : autoV(t);
        knob.setAttribute("transform", `translate(${A + (Bx - A) * v} ${SY})`);
        sFill.setAttribute("d", `M${A} ${SY} H${A + (Bx - A) * v}`);
        const n = user !== null ? user : Math.round(1 + 3 * v);
        knob.setAttribute("aria-valuenow", n);
        nums.forEach((m, i) => m.setAttribute("fill", i + 1 <= n ? INK : MUTE));

        const live = seg(t, 6.0, 6.5);
        rows.forEach((R, i) => {
          let k;
          if (user === null) k = ob(seg(t, APPEAR[i], APPEAR[i] + 0.45));
          else { const V = vis[i]; k = calm ? +V.on : V.on ? ob(seg(now - V.at, 0, 0.4)) : 1 - io(seg(now - V.at, 0, 0.3)); }
          R.g.setAttribute("opacity", cl(k * 1.6));
          R.g.setAttribute("transform", `translate(${-24 * (1 - k)} 0)`);
          const f = fillAt(i, t), stopped = i === 1 && t >= HIT;
          const ov = i === 1 ? 0.012 * dip(seg(t, HIT, HIT + 0.3)) : 0;
          R.bar.setAttribute("width", 3 + (f + ov) * BW);
          R.bar.setAttribute("fill", stopped ? mix(MINT, YEL, seg(t, HIT, HIT + 0.25)) : MINT);
          const fl = seg(t, HIT, HIT + 0.6);
          R.flash.setAttribute("opacity", i === 1 && fl > 0 && fl < 1 ? 1 - fl : 0); R.flash.setAttribute("r", 8 + 18 * oc(fl));
          const p = bump(t, END, 1.6, i * 0.2, 0.5) * live;
          R.tip.setAttribute("cx", X0 + f * BW); R.tip.setAttribute("r", 4 + 1.8 * p);
          R.tip.setAttribute("opacity", i === 1 || f < 0.02 ? 0 : 1);
        });
        const tk = seg(t, HIT + 0.15, HIT + 0.6), rk = user === null ? 1 : calm ? +vis[1].on : vis[1].on ? seg(now - vis[1].at, 0, 0.3) : 1 - seg(now - vis[1].at, 0, 0.2);
        tf(tag.g, X0 + tag.w / 2, ROW[1] + 29 - 2 * bump(t, END, 2.4, 0.3, 0.5) * live, 0.4 + 0.6 * ob(tk), -8 * (1 - ob(tk)));
        tag.g.setAttribute("opacity", seg(tk, 0, 0.3) * rk);
        muted.setAttribute("opacity", seg(t, 2.8, 3.3));
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
    // with reduced motion a tap redraws the still frame with the new choice instead of starting playback
    const api = { now: clock, calm, seek: (s) => { if (calm) return frame(); off = s - clock(); held = false; tick(); }, poke: () => { if (calm) return frame(); held = false; tick(); } };
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
