/* Bright coded scenes for "Cursor vs Cline". Vanilla JS, no library.
   <figure class="mg" data-scene="NAME"> holds a still image; this script swaps in a live SVG.
   Plays only in view, honours reduced motion, "?mgstill" freezes each scene on its still frame. */
(() => {
  const NS = "http://www.w3.org/2000/svg";
  const INK = "#1A1320", YEL = "#FFCA54", BLUE = "#6C8EF5", LIL = "#B69CFF", MINT = "#7FD8AE", SKY = "#9AD8FF", SOFT = "#F1ECF9", MUTE = "#7A6A88";
  const SANS = '"Space Grotesk", system-ui, sans-serif', MONO = '"JetBrains Mono", ui-monospace, monospace';
  const SW = 4;
  const el = (t, a = {}, p) => { const n = document.createElementNS(NS, t); for (const k in a) n.setAttribute(k, a[k]); if (p) p.appendChild(n); return n; };
  const txt = (p, x, y, s, a = {}) => { const n = el("text", Object.assign({ x, y, "font-family": SANS, "font-size": 34, "font-weight": 600, fill: INK }, a), p); n.textContent = s; return n; };
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
  const line = (p, d, a = {}) => el("path", Object.assign({ d, stroke: INK, "stroke-width": SW, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, a), p);
  const box = (p, x, y, w, h, fill, rx = 22, a = {}) => el("rect", Object.assign({ x, y, width: w, height: h, rx, fill, stroke: INK, "stroke-width": SW }, a), p);
  const ring = (p, x, y, w, h, rx) => el("rect", { x, y, width: w, height: h, rx, fill: "none", stroke: INK, "stroke-width": SW, "stroke-dasharray": "4 10", class: "mg-ring" }, p);
  const len = (n) => { try { return n.getComputedTextLength(); } catch (e) { return 0; } };
  const starPath = (R, r) => { let d = ""; for (let i = 0; i < 10; i++) { const a = (-90 + i * 36) * Math.PI / 180, q = i % 2 ? r : R; d += `${i ? "L" : "M"}${(Math.cos(a) * q).toFixed(1)} ${(Math.sin(a) * q).toFixed(1)} `; } return d + "Z"; };
  const spark = (p, s, fill) => el("path", { d: `M0 ${-s} Q${s * 0.18} ${-s * 0.18} ${s} 0 Q${s * 0.18} ${s * 0.18} 0 ${s} Q${-s * 0.18} ${s * 0.18} ${-s} 0 Q${-s * 0.18} ${-s * 0.18} 0 ${-s} Z`, fill }, p);

  const SC = {};

  /* ---- 1. two cafe menu boards: which models each one lets you use ---- */
  SC.menu = {
    w: 1600, h: 1200, dur: 13, still: 9.6,
    build(svg, api) {
      txt(svg, 60, 118, "Which models can you use?", { "font-size": 56, "font-weight": 700 });
      txt(svg, 1540, 116, "tap Cursor or Cline", { "text-anchor": "end", "font-size": 30, "font-weight": 500, fill: MUTE });
      const TOP = 240, BW = 700, BH = 760, NY = 170, say0 = "This is the real split.";
      const B = [
        { x: 60, name: "Cursor", head: YEL, mark: SKY, say: "On Plus you get Grok and Composer models only.",
          aria: "Cursor: Plus has Grok 4.7, Grok 4.6, Grok 4.5 and Composer 2.5. Premium and above add other labs, at API list price.",
          rows: [["h", "Plus", 206], ["i", "Grok 4.7", 272], ["i", "Grok 4.6", 332], ["i", "Grok 4.5", 392], ["i", "Composer 2.5", 452], ["r", "", 500], ["h", "Premium and above", 570], ["i", "other labs,", 636], ["c", "at API list price", 696]] },
        { x: 840, name: "Cline", head: LIL, mark: MINT, say: "BYOK means bring your own key: you pay your model provider directly.",
          aria: "Cline: free for individuals, you pay for inference at cost or BYOK, bring your own key.",
          rows: [["h", "Free for individuals", 206], ["s", "you pay for inference", 264], ["r", "", 316], ["b", "at cost", 436], ["s", "or", 520], ["b", "BYOK", 632], ["s", "bring your own key", 700]] },
      ];
      let pick = -1, tapAt = -99;
      const boards = B.map((b, bi) => {
        const cx = b.x + BW / 2, g = el("g", {}, svg);
        line(g, `M${b.x + 150} ${TOP} L${cx} ${NY} L${b.x + BW - 150} ${TOP}`);
        box(g, b.x, TOP, BW, BH, "#fff", 28);
        ring(g, b.x - 14, TOP - 14, BW + 28, BH + 28, 40);
        box(g, b.x + 26, TOP + 26, BW - 52, 108, b.head, 18);
        txt(g, cx, TOP + 101, b.name, { "text-anchor": "middle", "font-size": 64, "font-weight": 700 });
        const items = [], marks = [];
        b.rows.forEach(([k, s, dy]) => {
          const y = TOP + dy, row = el("g", {}, g);
          items.push(row);
          if (k === "r") { line(row, `M${b.x + 52} ${y} H${b.x + BW - 52}`, { stroke: MUTE, "stroke-dasharray": "2 14" }); return; }
          const big = k === "b", fs = k === "h" ? 46 : big ? 84 : k === "s" ? 36 : 42;
          const tx = k === "i" || k === "c" ? b.x + 96 : b.x + 56;
          const mk = k === "i" || k === "c" || big ? el("rect", { x: tx - 14, y: y - fs * 0.84, height: fs * 1.12, rx: fs * 0.3, width: 0.01, fill: b.mark }, row) : null;
          if (k === "i") el("circle", { cx: b.x + 66, cy: y - fs * 0.32, r: 8, fill: INK }, row);
          const n = txt(row, tx, y, s, { "font-size": fs, "font-weight": k === "h" || big ? 700 : 500, fill: k === "s" ? MUTE : INK });
          if (mk) marks.push({ n: mk, w: len(n) + 28 });
        });
        el("circle", { cx, cy: NY, r: 13, fill: SOFT, stroke: INK, "stroke-width": SW }, svg);
        button(g, b.aria, () => { pick = pick === bi ? -1 : bi; tapAt = api.now(); api.poke(); });
        return { g, cx, items, marks };
      });
      el("rect", { x: 60, y: 1044, width: 1480, height: 84, rx: 42, fill: SOFT }, svg);
      const cap = txt(svg, 800, 1098, say0, { "text-anchor": "middle", "font-size": 34, "font-weight": 500 });
      return (t, now) => {
        const live = pick >= 0, d = now - tapAt;
        boards.forEach((o, bi) => {
          const st = 0.15 + bi * 0.3, drop = oc(seg(t, st, st + 0.7)), u = t - st;
          const sw = live ? (pick === bi ? 2.5 * Math.sin(d * 12) * Math.exp(-d * 3) : 0) : u > 0 ? 6 * Math.sin(u * 5.5) * Math.exp(-u * 1.3) : 0;
          o.g.setAttribute("transform", `translate(0 ${live ? 0 : -70 * (1 - drop)}) rotate(${sw.toFixed(3)} ${o.cx} ${NY})`);
          o.g.setAttribute("opacity", live ? (pick === bi ? 1 : 0.5) : drop);
          o.items.forEach((r, j) => { const s0 = 1.0 + bi * 2.1 + j * 0.24, a = live ? 1 : oc(seg(t, s0, s0 + 0.4)); r.setAttribute("opacity", a); r.setAttribute("transform", `translate(${-24 * (1 - a)} 0)`); });
          const hs = 5.0 + bi * 1.6;
          o.marks.forEach((m, j) => { const k = live ? (pick === bi ? oc(seg(d, 0.05 + j * 0.06, 0.45 + j * 0.06)) : 0) : oc(seg(t, hs + j * 0.15, hs + 0.45 + j * 0.15)); m.n.setAttribute("width", Math.max(0.01, m.w * k)); });
        });
        cap.textContent = live ? B[pick].say : t >= 5 && t < 6.6 ? B[0].say : t >= 6.6 && t < 8.8 ? B[1].say : say0;
      };
    },
  };

  /* ---- 2. a step ladder of Cursor plans, and Cline's one low step ---- */
  SC.ladder = {
    w: 1600, h: 1200, dur: 12.8, still: 7,
    build(svg, api) {
      txt(svg, 60, 118, "Cursor's plans", { "font-size": 56, "font-weight": 700 });
      txt(svg, 1540, 116, "Tap a rung to see what it adds", { "text-anchor": "end", "font-size": 30, "font-weight": 500, fill: MUTE });
      const P = [
        ["Free", "$0", "Free, $0", ["Agent and Chat", "with limited usage"]],
        ["Plus", "$8", "Plus, $8 a month", ["Agent with Cursor's own models", "Grok 4.7, Grok 4.6, Grok 4.5", "Composer 2.5"]],
        ["Premium", "$30", "Premium, $30 a month", ["4x the usage of Plus", "cloud agents and automations", "Bugbot and Origin", "third party models"]],
        ["Super", "$100", "Super, $100 a month", ["the usage of Plus"], "15x"],
        ["Ultra", "$200", "Ultra, $200 a month", ["the usage of Plus"], "50x"],
      ];
      const FLOOR = 1120, TOPY = 236, CX = 420, YS = [1000, 830, 660, 490, 320];
      const lx = (y) => 130 + 110 * (FLOOR - y) / (FLOOR - TOPY), rx = (y) => 710 - 110 * (FLOOR - y) / (FLOOR - TOPY);
      line(svg, `M60 ${FLOOR} H1540`);
      const frame = el("g", {}, svg);
      [[lx, 1], [rx, -1]].forEach(([f, s]) => el("path", { d: `M${f(FLOOR)} ${FLOOR} L${f(TOPY)} ${TOPY} L${f(TOPY) + 38 * s} ${TOPY} L${f(FLOOR) + 38 * s} ${FLOOR} Z`, fill: BLUE, stroke: INK, "stroke-width": SW, "stroke-linejoin": "round" }, frame));
      box(frame, lx(TOPY) - 24, TOPY - 40, rx(TOPY) - lx(TOPY) + 48, 48, SOFT, 14);
      let pick = -1, tapAt = -99, shown = -2;
      const rungs = P.map((p, i) => {
        const y = YS[i], w = rx(y) - lx(y) + 36, g = el("g", {}, svg);
        ring(g, -w / 2 - 12, -52, w + 24, 104, 30);
        const bg = box(g, -w / 2, -40, w, 80, "#fff", 20);
        txt(g, -w / 2 + 32, 14, p[0], { "font-size": 40, "font-weight": 700 });
        txt(g, w / 2 - 32, 14, p[1], { "text-anchor": "end", "font-family": MONO, "font-size": 38, "font-weight": 700 });
        button(g, `${p[2]}: ${p[4] ? p[4] + " " : ""}${p[3].join(", ")}`, () => { pick = i; tapAt = api.now(); api.poke(); });
        return { g, bg, y, w };
      });
      const link = el("g", {}, svg), lk = line(link, "M0 0"), d1 = el("circle", { r: 9, fill: INK }, link), d2 = el("circle", { r: 9, fill: INK }, link);
      const card = el("g", {}, svg);
      box(card, 800, 196, 740, 530, "#fff", 28);
      const body = el("g", {}, card);
      const head = txt(body, 844, 282, "", { "font-size": 46, "font-weight": 700 });
      line(body, "M844 320 H1496", { stroke: MUTE, "stroke-dasharray": "2 14" });
      const bigN = txt(body, 836, 540, "", { "font-size": 190, "font-weight": 700, "letter-spacing": -4 });
      const rows = [0, 1, 2, 3].map(() => txt(body, 844, 0, "", { "font-size": 38, "font-weight": 500 }));
      const show = (i) => {
        const p = P[i], few = p[3].length <= 2;
        head.textContent = p[2]; bigN.textContent = p[4] || "";
        rows.forEach((n, j) => { n.textContent = p[3][j] || ""; n.setAttribute("font-size", few ? 50 : 38); n.setAttribute("y", p[4] ? 640 : few ? 440 + j * 100 : p[3].length === 3 ? 410 + j * 100 : 396 + j * 84); n.setAttribute("font-family", /Grok|Composer/.test(p[3][j] || "") ? MONO : SANS); });
      };
      const cline = el("g", {}, svg), ct = txt(cline, 820, 860, "Cline", { "font-size": 56, "font-weight": 700 });
      el("tspan", { "font-size": 36, "font-weight": 500, fill: MUTE }, ct).textContent = "  has no plan ladder";
      const step = el("g", {}, svg);
      box(step, 820, 960, 440, 160, MINT, 20);
      txt(step, 1040, 1028, "Free for", { "text-anchor": "middle", "font-size": 42, "font-weight": 700 });
      txt(step, 1040, 1080, "individuals", { "text-anchor": "middle", "font-size": 42, "font-weight": 700 });
      const sign = el("g", {}, svg);
      line(sign, "M1330 1080 L1316 1120 M1490 1080 L1504 1120");
      box(sign, 1290, 968, 250, 112, YEL, 18);
      txt(sign, 1415, 1014, "Enterprise,", { "text-anchor": "middle", "font-size": 32, "font-weight": 700 });
      txt(sign, 1415, 1056, "contact sales", { "text-anchor": "middle", "font-size": 30, "font-weight": 500 });
      return (t, now) => {
        const live = pick >= 0, k0 = live ? 1 : oc(seg(t, 0.1, 0.8));
        frame.setAttribute("opacity", k0); frame.setAttribute("transform", `translate(0 ${40 * (1 - k0)})`);
        const cur = live ? pick : t < 2.4 ? -1 : Math.min(4, Math.floor((t - 2.4) / 1.8));
        rungs.forEach((r, i) => {
          const k = live ? 1 : ob(seg(t, 0.5 + i * 0.22, 0.95 + i * 0.22)), on = cur === i;
          tf(r.g, CX, r.y, Math.max(0.001, k) * (on ? 1.04 : 1));
          r.g.setAttribute("opacity", live ? 1 : seg(t, 0.5 + i * 0.22, 0.7 + i * 0.22));
          r.bg.setAttribute("fill", on ? YEL : "#fff");
        });
        const ca = live ? 1 : oc(seg(t, 2.1, 2.5));
        card.setAttribute("opacity", ca);
        const ci = cur < 0 ? 0 : cur;
        if (ci !== shown) { show(ci); shown = ci; }
        const u = live ? now - tapAt : cur < 0 ? 1 : (t - 2.4) - cur * 1.8, a = oc(seg(u, 0, 0.35));
        body.setAttribute("opacity", a); body.setAttribute("transform", `translate(${18 * (1 - a)} 0)`);
        const r = rungs[ci], x1 = CX + r.w / 2 * (cur === ci ? 1.04 : 1), y1 = r.y, y2 = cl(r.y, 260, 680);
        lk.setAttribute("d", `M${x1 + 14} ${y1} C${x1 + 90} ${y1} ${710} ${y2} ${786} ${y2}`);
        d1.setAttribute("cx", x1 + 14); d1.setAttribute("cy", y1); d2.setAttribute("cx", 786); d2.setAttribute("cy", y2);
        link.setAttribute("opacity", cur < 0 ? 0 : ca);
        const c1 = live ? 1 : oc(seg(t, 1.4, 1.9)), c2 = live ? 1 : ob(seg(t, 1.6, 2.1)), c3 = live ? 1 : ob(seg(t, 2.0, 2.5));
        cline.setAttribute("opacity", c1);
        step.setAttribute("transform", `translate(1040 1120) scale(1 ${Math.max(0.001, c2)}) translate(-1040 -1120)`);
        sign.setAttribute("transform", `translate(1415 1120) scale(${Math.max(0.001, c3)}) translate(-1415 -1120)`);
      };
    },
  };

  /* ---- 3. two constellations on a white sky: where each one runs ---- */
  SC.stars = {
    w: 1600, h: 1200, dur: 13, still: 10,
    build(svg) {
      txt(svg, 60, 118, "Where does each one run?", { "font-size": 56, "font-weight": 700 });
      const moon = el("path", { d: "M0 -52 A52 52 0 0 0 0 52 A24 52 0 0 1 0 -52 Z", fill: YEL, stroke: INK, "stroke-width": SW, "stroke-linejoin": "round" }, svg);
      tf(moon, 1490, 112, 1, -24);
      const SP = [[820, 200, 14, LIL], [1150, 180, 12, SKY], [480, 230, 12, SKY], [120, 560, 14, LIL], [770, 660, 16, SKY], [560, 760, 12, LIL], [140, 990, 14, SKY], [720, 1000, 12, LIL], [1290, 900, 14, LIL], [1520, 520, 12, SKY], [1060, 600, 12, YEL], [1500, 960, 14, YEL], [880, 980, 16, YEL], [110, 420, 12, YEL], [640, 330, 10, SKY]];
      const sparks = SP.map(([x, y, s, c]) => { const g = el("g", {}, svg); spark(g, s, c); return { g, x, y }; });
      const C = [
        { name: "Cursor", nx: 400, fill: YEL, t0: 0.2,
          pts: [[250, 330, "desktop editor", "up"], [600, 520, "CLI", "right"], [330, 800, "cloud agents", "down", "(Premium and above)"]], links: [[0, 1], [1, 2], [2, 0]] },
        { name: "Cline", nx: 1210, fill: SKY, t0: 3.7,
          pts: [[900, 330, "VS Code", "down"], [1200, 470, "CLI", "down"], [1380, 300, "desktop app", "up"], [1430, 700, "SDK", "down"], [1010, 790, "JetBrains", "down"]], links: [[0, 1], [1, 2], [2, 3], [3, 4]] },
      ];
      const parts = C.map((c) => {
        const lg = el("g", {}, svg);
        const ls = c.links.map(([a, b]) => { const A = c.pts[a], Bp = c.pts[b], dx = Bp[0] - A[0], dy = Bp[1] - A[1], L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L; return { n: line(lg, "M0 0", c.pts[b][5] ? { "stroke-dasharray": "4 14" } : {}), ax: A[0] + ux * 62, ay: A[1] + uy * 62, bx: Bp[0] - ux * 62, by: Bp[1] - uy * 62 }; });
        const ss = c.pts.map(([x, y, label, side, sub, dim]) => {
          const g = el("g", {}, svg), s = el("g", {}, g);
          el("circle", { r: 66, fill: dim ? "#fff" : SOFT }, s);
          el("path", { d: starPath(46, 20), fill: dim ? SOFT : c.fill, stroke: INK, "stroke-width": SW, "stroke-linejoin": "round" }, s);
          const lab = el("g", {}, g);
          if (side === "up") txt(lab, 0, -84, label, { "text-anchor": "middle", "font-size": 42, "font-weight": 600 });
          else if (side === "right") txt(lab, 78, 15, label, { "text-anchor": "start", "font-size": 42, "font-weight": 600 });
          else txt(lab, 0, 112, label, { "text-anchor": "middle", "font-size": 42, "font-weight": 600 });
          if (sub) txt(lab, 0, 154, sub, { "text-anchor": "middle", "font-size": 32, "font-weight": 500, fill: MUTE });
          tf(g, x, y);
          return { s, lab, x, y };
        });
        const ng = el("g", {}, svg), nt = txt(ng, c.nx, 1080, c.name, { "text-anchor": "middle", "font-size": 66, "font-weight": 700 }), w = len(nt);
        ng.insertBefore(el("rect", { x: c.nx - w / 2 - 10, y: 1062, width: w + 20, height: 26, rx: 13, fill: c.fill }), nt);
        return { c, ls, ss, ng };
      });
      return (t) => {
        sparks.forEach((p, i) => tf(p.g, p.x, p.y, 0.55 + 0.45 * Math.abs(Math.sin(t * 1.3 + i * 0.9)), t * 20 + i * 15));
        parts.forEach(({ c, ls, ss, ng }) => {
          ss.forEach((s, i) => {
            const st = c.t0 + i * 0.3, k = ob(seg(t, st, st + 0.45));
            tf(s.s, 0, 0, Math.max(0.001, k) * (1 + 0.05 * Math.sin(t * 2.2 + i * 1.7)), 8 * Math.sin(t * 0.9 + i));
            s.lab.setAttribute("opacity", oc(seg(t, st + 0.2, st + 0.6)));
          });
          const l0 = c.t0 + ss.length * 0.3 + 0.2;
          ls.forEach((l, i) => { const k = io(seg(t, l0 + i * 0.7, l0 + i * 0.7 + 0.6)); l.n.setAttribute("d", `M${l.ax} ${l.ay} L${(l.ax + (l.bx - l.ax) * k).toFixed(1)} ${(l.ay + (l.by - l.ay) * k).toFixed(1)}`); l.n.setAttribute("opacity", k > 0.001 ? 1 : 0); });
          const nk = oc(seg(t, l0 + ls.length * 0.7, l0 + ls.length * 0.7 + 0.5));
          ng.setAttribute("opacity", nk); ng.setAttribute("transform", `translate(0 ${20 * (1 - nk)})`);
        });
      };
    },
  };

  /* ---- title card, 16 by 9 ---- */
  SC.hero = {
    w: 1600, h: 900, dur: 9, still: 4,
    build(svg) {
      const kick = txt(svg, 108, 166, "Comparisons", { "font-family": MONO, "font-size": 32, "font-weight": 700 }), kw = len(kick);
      svg.insertBefore(box(null, 80, 120, kw + 56, 64, MINT, 32), kick);
      txt(svg, 74, 370, "Cursor", { "font-size": 172, "font-weight": 700, "letter-spacing": -3 });
      const vs = txt(svg, 74, 548, "vs Cline", { "font-size": 172, "font-weight": 700, "letter-spacing": -3 }), vw = len(vs);
      svg.insertBefore(el("rect", { x: 84, y: 520, width: vw - 10, height: 34, rx: 17, fill: YEL }), vs);
      txt(svg, 80, 650, "A paid editor and an open source agent", { "font-size": 42, "font-weight": 500, fill: MUTE });
      const ck = txt(svg, 112, 784, "Checked 19 Oct 2026", { "font-family": MONO, "font-size": 34, "font-weight": 700 }), cw = len(ck);
      svg.insertBefore(box(null, 80, 734, cw + 64, 72, SOFT, 36, { stroke: "none" }), ck);
      const PX = 1240, PY = 380, R = 250;
      box(svg, PX - 12, PY, 24, 840 - PY, SOFT, 12);
      [[740, 200], [790, 280], [720, 360]].forEach(([x, y], i) => line(svg, `M${x} ${y} q40 -22 80 0 t80 0`, { stroke: i === 1 ? LIL : SKY }));
      const wheel = el("g", {}, svg);
      [YEL, BLUE, LIL, MINT].forEach((c, i) => {
        const b = el("g", { transform: `rotate(${i * 90})` }, wheel);
        el("path", { d: `M0 0 L0 ${-R} C${R * 0.5} ${-R * 0.98} ${R * 0.86} ${-R * 0.62} ${R * 0.5} ${-R * 0.14} Z`, fill: c, stroke: INK, "stroke-width": SW, "stroke-linejoin": "round" }, b);
        line(b, `M0 0 L${R * 0.2} ${-R * 0.62}`);
      });
      el("circle", { cx: PX, cy: PY, r: 20, fill: "#fff", stroke: INK, "stroke-width": SW }, svg);
      const sp = [[1540, 120, 16, YEL], [960, 600, 14, LIL], [1520, 700, 14, SKY]].map(([x, y, s, c]) => { const g = el("g", {}, svg); spark(g, s, c); return { g, x, y }; });
      return (t) => {
        tf(wheel, PX, PY, 1, t * 45);
        sp.forEach((p, i) => tf(p.g, p.x, p.y, 0.6 + 0.4 * Math.abs(Math.sin(t * 1.4 + i)), t * 25));
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
