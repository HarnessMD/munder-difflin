/* Bright coded scenes for "Build your own Claude Duet". Vanilla JS, no library.
   <figure class="mg" data-scene="NAME"> holds a still image; this script swaps in a live SVG.
   Plays only in view, honours reduced motion, "?mgstill" freezes each scene on its still frame. */
(() => {
  const NS = "http://www.w3.org/2000/svg";
  const INK = "#1A1320", YEL = "#FFCA54", BLUE = "#6C8EF5", LIL = "#B69CFF", MINT = "#7FD8AE", SKY = "#9AD8FF", SOFT = "#F1ECF9", MUTE = "#7A6A88";
  const LIL_SOFT = "#E6DCFF", GREY = "#CAC3D2";
  const SANS = '"Space Grotesk", system-ui, sans-serif', MONO = '"JetBrains Mono", ui-monospace, monospace';
  const el = (t, a = {}, p) => { const n = document.createElementNS(NS, t); for (const k in a) n.setAttribute(k, a[k]); if (p) p.appendChild(n); return n; };
  const txt = (p, x, y, s, a = {}) => { const n = el("text", Object.assign({ x, y, "font-family": SANS, "font-size": 24, "font-weight": 600, fill: INK }, a), p); n.textContent = s; return n; };
  const mono = (p, x, y, s, a = {}) => txt(p, x, y, s, Object.assign({ "font-family": MONO, "font-weight": 500 }, a));
  const fit = (n, max) => { const w = n.getComputedTextLength(); if (w > max) n.setAttribute("font-size", (+n.getAttribute("font-size") * max) / w); return n; };
  const cl = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const seg = (t, a, b) => cl((t - a) / (b - a));
  const oc = (x) => 1 - Math.pow(1 - x, 3);
  /* back out with an adjustable overshoot: c 1.7 is a lively arrival, c 0.8 a soft one */
  const bk = (x, c = 1.70158) => 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2);
  const ob = (x) => bk(x);
  const io = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const dip = (k) => (k > 0 && k < 1 ? Math.sin(Math.PI * k) : 0);
  const squash = (k) => (k > 0 && k < 1 ? Math.sin(k * Math.PI * 2) * (1 - k) * 0.14 : 0);
  /* idle breath: 0 at rest, one smooth swell per period P, always at rest when t = end */
  const breathe = (t, end, P) => (1 - Math.cos((2 * Math.PI * (t - end)) / P)) / 2;
  /* a cursor blink that is on at t = end */
  const blink = (t, end, P = 0.9) => ((((t - end) / P) % 1) + 1) % 1 < 0.55;
  const tf = (n, x, y, s = 1, r = 0) => n.setAttribute("transform", `translate(${x} ${y}) rotate(${r}) scale(${s})`);
  const hex = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
  const mix = (a, b, k) => { const A = hex(a), B = hex(b); return "#" + A.map((v, i) => Math.round(v + (B[i] - v) * cl(k)).toString(16).padStart(2, "0")).join(""); };
  const rise = (n, k, d = 16) => { n.setAttribute("transform", `translate(0 ${d * (1 - oc(k))})`); n.setAttribute("opacity", seg(k, 0, 0.4)); };
  /* show the first k characters of s, k from a time window */
  const type = (n, s, t, a, b) => { const k = Math.floor(seg(t, a, b) * s.length + 1e-6); n.textContent = s.slice(0, k); return k; };
  const qb = (A, C, B, p) => { const u = 1 - p; return [u * u * A[0] + 2 * u * p * C[0] + p * p * B[0], u * u * A[1] + 2 * u * p * C[1] + p * p * B[1]]; };
  const qa = (A, C, B, p) => { const u = 1 - p, dx = 2 * u * (C[0] - A[0]) + 2 * p * (B[0] - C[0]), dy = 2 * u * (C[1] - A[1]) + 2 * p * (B[1] - C[1]); return (Math.atan2(dy, dx) * 180) / Math.PI; };
  const button = (g, label, fn) => {
    g.setAttribute("role", "button"); g.setAttribute("tabindex", "0"); g.setAttribute("aria-label", label); g.classList.add("mg-hit");
    g.addEventListener("click", fn);
    g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); } });
  };
  const hint = (svg, s, x = 772, y = 50) => txt(svg, x, y, s, { "text-anchor": "end", "font-size": 16, fill: MUTE, "font-weight": 500 });
  /* a pill button with a dashed focus ring, centred on its origin */
  const mkBtn = (p, label, fs = 18, fill = YEL) => {
    const g = el("g", {}, p), body = el("g", {}, g);
    const r = el("rect", { y: -21, height: 42, rx: 21, fill, stroke: INK, "stroke-width": 2.5 }, body);
    const t = txt(body, 0, 6.5, label, { "text-anchor": "middle", "font-size": fs, "font-weight": 700 });
    const w = Math.ceil(t.getComputedTextLength()) + 44;
    r.setAttribute("x", -w / 2); r.setAttribute("width", w);
    el("rect", { x: -w / 2 - 6, y: -27, width: w + 12, height: 54, rx: 27, fill: "none", stroke: INK, "stroke-width": 2, "stroke-dasharray": "4 5", class: "mg-ring" }, body);
    return { g, body, r, w };
  };
  /* an envelope centred on its origin */
  const mkEnv = (p, fill = YEL) => {
    const g = el("g", { opacity: 0 }, p), inner = el("g", {}, g);
    el("rect", { x: -20, y: -14, width: 40, height: 28, rx: 4, fill, stroke: INK, "stroke-width": 2.5 }, inner);
    el("path", { d: "M-20 -13 L0 3 L20 -13", stroke: INK, "stroke-width": 2.5, fill: "none", "stroke-linejoin": "round" }, inner);
    return { g, inner };
  };
  /* a small terminal window body: white box, coloured title band, three dots; returns dot nodes */
  const termFrame = (p, x0, y0, w, h, band, r = 12, bh = 30) => {
    el("rect", { x: x0, y: y0, width: w, height: h, rx: r, fill: "#fff" }, p);
    const head = el("path", { d: `M${x0} ${y0 + bh} V${y0 + r} A${r} ${r} 0 0 1 ${x0 + r} ${y0} H${x0 + w - r} A${r} ${r} 0 0 1 ${x0 + w} ${y0 + r} V${y0 + bh} Z`, fill: band }, p);
    el("path", { d: `M${x0} ${y0 + bh} H${x0 + w}`, stroke: INK, "stroke-width": 2.5 }, p);
    const dots = [0, 1, 2].map((i) => { const d = el("g", {}, p); el("circle", { r: 4, fill: "#fff", stroke: INK, "stroke-width": 2 }, d); tf(d, x0 + 18 + i * 13, y0 + bh / 2); return { d, x: x0 + 18 + i * 13, y: y0 + bh / 2 }; });
    el("rect", { x: x0, y: y0, width: w, height: h, rx: r, fill: "none", stroke: INK, "stroke-width": 3 }, p);
    return { head, dots };
  };

  const SC = {};

  /* ---- title card, 16 by 9: a sun rises behind a terminal that prints the brief ---- */
  SC.hero = {
    w: 960, h: 540, dur: 10, still: 10,
    build(svg) {
      const END = 10, SX = 750, SY = 222;
      const defs = el("defs", {}, svg);
      const pill = el("g", {}, svg);
      const pr = el("rect", { y: -20, height: 40, rx: 20, fill: YEL, stroke: INK, "stroke-width": 2.5 }, pill);
      const pt = txt(pill, 0, 7, "Guide", { "text-anchor": "middle", "font-size": 19, "font-weight": 700 });
      const pw = Math.ceil(pt.getComputedTextLength()) + 40;
      pr.setAttribute("x", -pw / 2); pr.setAttribute("width", pw);
      const l1g = el("g", {}, svg), l2g = el("g", {}, svg);
      const l1 = txt(l1g, 60, 194, "Build your own", { "font-size": 66, "font-weight": 700 });
      const l2 = txt(l2g, 60, 268, "Claude Duet", { "font-size": 66, "font-weight": 700 });
      const TW = 520, tmax = Math.max(l1.getComputedTextLength(), l2.getComputedTextLength());
      if (tmax > TW) [l1, l2].forEach((n) => n.setAttribute("font-size", (66 * TW) / tmax));
      const UL = Math.round(l2.getComputedTextLength() * 0.6);
      const under = el("path", { d: `M66 292 H${66 + UL}`, stroke: YEL, "stroke-width": 14, "stroke-linecap": "round", fill: "none" }, svg);
      const s1g = el("g", {}, svg), s2g = el("g", {}, svg);
      const s1 = txt(s1g, 63, 344, "A free morning brief", { "font-size": 27, "font-weight": 500, fill: MUTE });
      const s2 = txt(s2g, 63, 379, "for your codebase", { "font-size": 27, "font-weight": 500, fill: MUTE });
      const smax = Math.max(s1.getComputedTextLength(), s2.getComputedTextLength());
      if (smax > 380) [s1, s2].forEach((n) => n.setAttribute("font-size", (27 * 380) / smax));
      const chkG = el("g", {}, svg);
      txt(chkG, 64, 470, "Checked 22 Oct 2026", { "font-size": 18, "font-weight": 500, fill: MUTE });

      /* sky, clipped at the horizon so the sun climbs out of the ground */
      const cp = el("clipPath", { id: "mg-byo-sky" }, defs);
      el("rect", { x: 0, y: 0, width: 960, height: 451 }, cp);
      const sky = el("g", { "clip-path": "url(#mg-byo-sky)" }, svg), sun = el("g", {}, sky);
      const glow = el("circle", { r: 104, fill: YEL, opacity: 0 }, sun);
      const rays = Array.from({ length: 12 }, (_, i) => ({ p: el("path", { stroke: INK, "stroke-width": 4, "stroke-linecap": "round", fill: "none" }, sun), a: (i * Math.PI) / 6 - Math.PI / 2, i }));
      el("circle", { r: 90, fill: YEL, stroke: INK, "stroke-width": 3 }, sun);
      el("path", { d: "M-60 -34 A70 70 0 0 1 -22 -66", stroke: "#fff", "stroke-width": 8, "stroke-linecap": "round", fill: "none", opacity: 0.85 }, sun);
      const RAY_ORDER = [0, 1, 11, 2, 10, 3, 9, 4, 8, 5, 7, 6];

      /* horizon */
      const hz = el("g", {}, svg);
      const hz1 = el("path", { d: "M466 452 H934", stroke: SOFT, "stroke-width": 16, "stroke-linecap": "round", fill: "none" }, hz);
      const hz2 = el("path", { d: "M466 452 H934", stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round", fill: "none" }, hz);

      /* terminal */
      const T = el("g", {}, svg);
      const tm = termFrame(T, -160, -105, 320, 210, SKY, 14, 32);
      const LINES = [["Morning brief", 3.3, 4.05, null], ["Pull requests", 4.35, 5.0, BLUE], ["Checks", 5.25, 5.6, MINT], ["Issues", 5.9, 6.25, LIL]];
      el("path", { d: "M-138 -44 L-129 -37 L-138 -30", stroke: INK, "stroke-width": 3, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, T);
      const lines = LINES.map(([s, a, b, c], i) => {
        const y = i === 0 ? -30 : -30 + 36 + (i - 1) * 34;
        const x = i === 0 ? -116 : -92;
        const n = mono(T, x, y, "", i === 0 ? { "font-size": 20, "font-weight": 700 } : { "font-size": 19 });
        n.textContent = s;
        const cw = n.getComputedTextLength() / s.length;
        n.textContent = "";
        let dot = null;
        if (c) { dot = el("g", {}, T); el("rect", { x: -6, y: -6, width: 12, height: 12, rx: 3, fill: c, stroke: INK, "stroke-width": 2 }, dot); }
        return { n, s, a, b, x, y, cw, dot };
      });
      const cur = el("rect", { width: 10, height: 20, rx: 1.5, fill: INK }, T);

      /* calendar tile */
      const cal = el("g", {}, svg), calIn = el("g", {}, cal);
      const burst = el("rect", { x: -44, y: -44, width: 88, height: 88, rx: 12, fill: "none", stroke: YEL, "stroke-width": 5, opacity: 0 }, cal);
      el("rect", { x: -44, y: -44, width: 88, height: 88, rx: 12, fill: "#fff" }, calIn);
      el("path", { d: "M-44 -16 V-32 A12 12 0 0 1 -32 -44 H32 A12 12 0 0 1 44 -32 V-16 Z", fill: LIL }, calIn);
      el("path", { d: "M-44 -16 H44", stroke: INK, "stroke-width": 2.5 }, calIn);
      el("rect", { x: -44, y: -44, width: 88, height: 88, rx: 12, fill: "none", stroke: INK, "stroke-width": 3 }, calIn);
      [-20, 20].forEach((x) => el("rect", { x: x - 4, y: -53, width: 8, height: 18, rx: 4, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, calIn));
      fit(mono(calIn, 0, 22, "08:00", { "text-anchor": "middle", "font-size": 23, "font-weight": 700 }), 74);

      return (t) => {
        const a = ob(seg(t, 0.15, 0.6));
        tf(pill, 64 + pw / 2, 82, 0.6 + 0.4 * a); pill.setAttribute("opacity", seg(t, 0.15, 0.3));
        [l1g, l2g].forEach((g, i) => rise(g, seg(t, 0.3 + i * 0.1, 0.9 + i * 0.1), 28));
        const ul = oc(seg(t, 0.95, 1.5)); under.setAttribute("stroke-dasharray", `${UL} ${UL + 20}`); under.setAttribute("stroke-dashoffset", UL * (1 - ul)); under.setAttribute("opacity", ul > 0 ? 1 : 0);
        [s1g, s2g].forEach((g, i) => rise(g, seg(t, 0.62 + i * 0.09, 1.2 + i * 0.09), 16));
        rise(chkG, seg(t, 0.95, 1.4), 10);

        const hk = oc(seg(t, 0.5, 1.3));
        [hz1, hz2].forEach((n) => { n.setAttribute("stroke-dasharray", "470 480"); n.setAttribute("stroke-dashoffset", 470 * (1 - hk)); });
        hz.setAttribute("opacity", hk > 0 ? 1 : 0);

        const settle = seg(t, 6.6, 7.2), b = breathe(t, END, 2.8) * settle;
        const sy = SY + 338 * (1 - bk(seg(t, 0.8, 3.0), 0.9));
        tf(sun, SX, sy, 1 + 0.015 * b);
        const gk = seg(t, 2.6, 3.4);
        glow.setAttribute("r", 100 + 8 * oc(gk) + 14 * b);
        glow.setAttribute("opacity", 0.22 * oc(gk) + 0.16 * b);
        rays.forEach((R) => {
          const k = bk(seg(t, 2.35 + RAY_ORDER.indexOf(R.i) * 0.06, 2.75 + RAY_ORDER.indexOf(R.i) * 0.06), 2.2);
          const r0 = 108, r1 = r0 + (20 + 4 * b) * k, c = Math.cos(R.a), s = Math.sin(R.a);
          R.p.setAttribute("d", `M${(c * r0).toFixed(2)} ${(s * r0).toFixed(2)} L${(c * r1).toFixed(2)} ${(s * r1).toFixed(2)}`);
          R.p.setAttribute("opacity", k > 0.02 ? 1 : 0);
        });

        const tk = seg(t, 1.2, 1.75);
        tf(T, SX, 335 + 22 * (1 - oc(tk)), 0.78 + 0.22 * ob(tk));
        T.setAttribute("opacity", seg(tk, 0, 0.3));
        tm.dots.forEach((D, j) => tf(D.d, D.x, D.y, ob(seg(t, 1.55 + j * 0.08, 1.9 + j * 0.08))));
        let cx = -116, cy = -30, typing = false;
        lines.forEach((L) => {
          const k = type(L.n, L.s, t, L.a, L.b);
          if (L.dot) { const dk = seg(t, L.a - 0.2, L.a + 0.1); tf(L.dot, -108, L.y - 6.5, ob(dk)); L.dot.setAttribute("opacity", dk > 0 ? 1 : 0); }
          if (t >= L.a - 0.2) { cx = L.x + k * L.cw; cy = L.y; }
          if (t >= L.a && t < L.b + 0.05) typing = true;
        });
        cur.setAttribute("x", cx + 3); cur.setAttribute("y", cy - 16);
        cur.setAttribute("opacity", tk > 0.5 && (typing || blink(t, END)) ? 1 : 0);

        const ck = seg(t, 1.7, 2.3), hp = dip(seg(t, 2.85, 3.25));
        tf(cal, 516, 404 - 64 * (1 - oc(ck)) - 12 * hp, 1 + 0.07 * hp, -6 - 16 * (1 - bk(ck, 2.4)));
        cal.setAttribute("opacity", seg(ck, 0, 0.25));
        const bu = seg(t, 2.9, 3.6);
        burst.setAttribute("transform", `scale(${1 + 0.45 * bu})`); burst.setAttribute("opacity", bu > 0 && bu < 1 ? 1 - bu : 0);
      };
    },
  };

  /* ---- 1. a schedule form fills in, saves, and at 08:00 sends its prompt to the brief agent ---- */
  SC.schedule = {
    dur: 14, still: 14,
    build(svg, api) {
      const END = 14, RP = 1.45;
      const hintT = hint(svg, "Tap Replay");

      /* the form card */
      const card = el("g", {}, svg);
      el("rect", { x: 40, y: 76, width: 452, height: 488, rx: 22, fill: "#fff", stroke: INK, "stroke-width": 3 }, card);
      const head = el("g", {}, svg);
      txt(head, 66, 122, "NEW SCHEDULE", { "font-size": 19, "font-weight": 700, "letter-spacing": 2.5 });
      const ic = el("g", {}, head);
      el("rect", { x: 438, y: 100, width: 28, height: 26, rx: 6, fill: YEL, stroke: INK, "stroke-width": 2.5 }, ic);
      el("path", { d: "M438 109 H466 M446 96 V103 M458 96 V103", stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round" }, ic);

      /* wrap the prompt to the box */
      const PROMPT = "List open pull requests, failing checks and new issues. Write me a short brief.";
      const probe = txt(svg, 0, -50, "", { "font-size": 18, "font-weight": 500 });
      const wrap = (s, max) => { const out = []; let line = ""; s.split(" ").forEach((w) => { const tryL = line ? line + " " + w : w; probe.textContent = tryL; if (probe.getComputedTextLength() > max && line) { out.push(line); line = w; } else line = tryL; }); out.push(line); return out; };
      const PL = wrap(PROMPT, 336);
      probe.remove();

      const F = [["LABEL", "Morning brief", 150, 1.5, 2.3], ["GOES TO", "brief agent", 232, 2.5, 3.2], ["WHEN", "Every day, 08:00", 314, 3.4, 4.3], ["PROMPT", null, 396, 4.5, 6.9]];
      const fields = F.map(([lab, val, fy, a, b], i) => {
        const g = el("g", {}, svg);
        txt(g, 66, fy, lab, { "font-size": 13, "font-weight": 700, fill: MUTE, "letter-spacing": 1.6 });
        const h = val ? 44 : PL.length * 26 + 22;
        const halo = el("rect", { x: 62, y: fy + 6, width: 408, height: h + 8, rx: 14, fill: "none", stroke: SKY, "stroke-width": 5, opacity: 0 }, g);
        const box = el("rect", { x: 66, y: fy + 10, width: 400, height: h, rx: 11, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, g);
        if (lab === "GOES TO") el("path", { d: `M440 ${fy + 28} L447 ${fy + 35} L454 ${fy + 28}`, stroke: INK, "stroke-width": 2.5, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, g);
        const rows = (val ? [val] : PL).map((s, j) => ({ s, n: txt(g, 80, val ? fy + 39 : fy + 37 + j * 26, "", { "font-size": val ? 19 : 18, "font-weight": 500 }) }));
        let off = 0; rows.forEach((r) => { r.o = off; off += r.s.length + 1; });
        const total = off - 1;
        const caret = el("rect", { width: 2.5, height: 22, fill: INK, opacity: 0 }, g);
        return { g, halo, box, rows, total, caret, a, b, i };
      });

      const save = el("g", {}, svg), saveB = el("g", {}, save);
      const sr = el("rect", { x: 0, y: -21, height: 42, rx: 21, fill: YEL, stroke: INK, "stroke-width": 2.5 }, saveB);
      const st = txt(saveB, 22, 6.5, "Save", { "font-size": 18, "font-weight": 700 });
      const sw = Math.ceil(st.getComputedTextLength()) + 44; sr.setAttribute("width", sw);
      const tag = el("g", {}, svg);
      const tr = el("rect", { x: 0, y: -16, height: 32, rx: 16, fill: MINT, stroke: INK, "stroke-width": 2.5 }, tag);
      el("path", { d: "M13 0 L18 5 L27 -5", stroke: INK, "stroke-width": 2.5, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, tag);
      const tt = txt(tag, 35, 6, "saved", { "font-size": 17, "font-weight": 700 });
      const tw = Math.ceil(tt.getComputedTextLength()) + 50; tr.setAttribute("width", tw);

      /* the clock */
      const CK = [660, 176], R = 62;
      const clock = el("g", {}, svg);
      const ring = el("circle", { r: R, fill: "none", stroke: YEL, "stroke-width": 6, opacity: 0 }, clock);
      el("circle", { r: R, fill: "#fff", stroke: INK, "stroke-width": 3 }, clock);
      for (let i = 0; i < 12; i++) { const an = (i * Math.PI) / 6, r1 = i % 3 ? 50 : 45; el("path", { d: `M${(Math.cos(an) * r1).toFixed(2)} ${(Math.sin(an) * r1).toFixed(2)} L${(Math.cos(an) * 54).toFixed(2)} ${(Math.sin(an) * 54).toFixed(2)}`, stroke: INK, "stroke-width": i % 3 ? 2 : 3.5, "stroke-linecap": "round" }, clock); }
      const hourH = el("path", { d: "M0 5 V-30", stroke: INK, "stroke-width": 6, "stroke-linecap": "round" }, clock);
      const minH = el("path", { d: "M0 6 V-44", stroke: BLUE, "stroke-width": 4.5, "stroke-linecap": "round" }, clock);
      el("circle", { r: 7, fill: YEL, stroke: INK, "stroke-width": 2.5 }, clock);
      const read = el("g", {}, svg);
      el("rect", { x: -54, y: -20, width: 108, height: 40, rx: 20, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, read);
      fit(mono(read, 0, 7.5, "08:00", { "text-anchor": "middle", "font-size": 21, "font-weight": 700 }), 84);

      /* the brief agent's terminal */
      const TC = [660, 494];
      const tile = el("g", {}, svg);
      const tGlow = el("rect", { x: -116, y: -70, width: 232, height: 140, rx: 18, fill: "none", stroke: YEL, "stroke-width": 7, opacity: 0 }, tile);
      const tBurst = el("rect", { x: -110, y: -64, width: 220, height: 128, rx: 14, fill: "none", stroke: YEL, "stroke-width": 5, opacity: 0 }, tile);
      const tfm = termFrame(tile, -110, -64, 220, 128, SOFT, 14, 30);
      el("path", { d: "M-88 -12 L-80 -5 L-88 2", stroke: INK, "stroke-width": 2.8, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, tile);
      fit(mono(tile, -70, 2, "brief agent", { "font-size": 19, "font-weight": 700 }), 170);
      const bars = [[-70, 22, 118], [-70, 40, 76]].map(([x, y, w]) => ({ n: el("rect", { x, y: y - 4, width: 0, height: 8, rx: 4, fill: GREY }, tile), w }));
      const tCur = el("rect", { x: 14, y: 30, width: 9, height: 17, rx: 1.5, fill: INK, opacity: 0 }, tile);

      /* the envelope's path, a dotted trail and the envelope */
      const A0 = [462, 414], A = [530, 414], C = [640, 330], B = [742, 440];
      const ecp = el("clipPath", { id: "mg-byo-out" }, el("defs", {}, svg));
      el("rect", { x: 494, y: 0, width: 400, height: 600 }, ecp);
      const trail = Array.from({ length: 16 }, (_, i) => { const p = 0.03 + i * 0.054, [x, y] = qb(A, C, B, p); return { n: el("circle", { cx: x, cy: y, r: 3, fill: GREY, opacity: 0 }, svg), p }; });
      const envWrap = el("g", {}, svg), env = mkEnv(envWrap);

      const btn = mkBtn(svg, "Replay");
      hintT.setAttribute("x", 772 - btn.w - 18); hintT.setAttribute("y", 56);
      let press = -99;
      button(btn.g, "Replay the schedule", () => { press = api.now(); api.seek(RP); });

      return (t, now) => {
        rise(card, seg(t, 0.15, 0.7), 24);
        rise(head, seg(t, 0.35, 0.8), 12);
        fields.forEach((f) => rise(f.g, seg(t, 0.5 + f.i * 0.1, 0.95 + f.i * 0.1), 14));
        const sk = seg(t, 0.95, 1.4);
        tf(save, 66, 522, 1); save.setAttribute("opacity", seg(sk, 0, 0.4));
        saveB.setAttribute("transform", `translate(${sw / 2} 0) scale(${0.7 + 0.3 * ob(sk)}) translate(${-sw / 2} 0)`);
        hintT.setAttribute("opacity", seg(t, 1.0, 1.4));

        /* typing, one field at a time, with a focus halo on the live field */
        fields.forEach((f) => {
          const k = Math.floor(seg(t, f.a, f.b) * f.total + 1e-6);
          let lastRow = f.rows[0];
          f.rows.forEach((r) => { const n = cl(k - r.o, 0, r.s.length); r.n.textContent = r.s.slice(0, n); if (k >= r.o) lastRow = r; });
          const live = t >= f.a - 0.15 && t < f.b + 0.25;
          const hk = live ? Math.min(seg(t, f.a - 0.15, f.a + 0.05), 1 - seg(t, f.b + 0.05, f.b + 0.25)) : 0;
          f.halo.setAttribute("opacity", hk);
          f.box.setAttribute("stroke", mix(INK, BLUE, hk));
          const typingNow = t >= f.a && t < f.b;
          f.caret.setAttribute("x", +lastRow.n.getAttribute("x") + lastRow.n.getComputedTextLength() + 2);
          f.caret.setAttribute("y", +lastRow.n.getAttribute("y") - 17);
          f.caret.setAttribute("opacity", live && (typingNow || blink(t, f.a, 0.7)) ? 1 : 0);
        });

        const pd = dip(seg(t, 7.2, 7.5));
        saveB.firstChild.setAttribute("fill", mix(YEL, "#FFE3A0", pd));
        if (pd > 0) saveB.setAttribute("transform", `translate(${sw / 2} ${3 * pd}) scale(${1 - 0.07 * pd}) translate(${-sw / 2} 0)`);
        const gk = seg(t, 7.45, 7.9);
        tf(tag, 66 + sw + 16, 522, 0.4 + 0.6 * ob(gk));
        tag.setAttribute("opacity", seg(gk, 0, 0.3));

        /* clock: in, then sweeps from seven to eight */
        const ce = seg(t, 0.8, 1.35);
        const sweep = io(seg(t, 7.95, 9.7)), wig = seg(t, 9.7, 10.25), w = wig > 0 && wig < 1 ? 7 * Math.sin(wig * Math.PI * 3) * (1 - wig) : 0;
        tf(clock, CK[0], CK[1], 0.5 + 0.5 * ob(ce));
        clock.setAttribute("opacity", seg(ce, 0, 0.3));
        tf(minH, 0, 0, 1, 360 * sweep + w);
        tf(hourH, 0, 0, 1, 210 + 30 * sweep + w * 0.3);
        const pk = seg(t, 9.7, 10.4);
        ring.setAttribute("r", R + 24 * pk); ring.setAttribute("opacity", pk > 0 && pk < 1 ? 1 - pk : 0);
        const rk = seg(t, 9.75, 10.2);
        tf(read, CK[0], 278, 0.5 + 0.5 * ob(rk)); read.setAttribute("opacity", seg(rk, 0, 0.3));

        /* envelope: pops out of the prompt box, arcs over, docks on the tile */
        const settle = seg(t, 11.9, 12.4), bob = 3.5 * Math.sin((2 * Math.PI * (t - END)) / 2.1) * settle;
        const e0 = seg(t, 9.8, 10.2), f = seg(t, 10.2, 11.0), p = io(f), land = seg(t, 11.0, 11.4);
        if (f <= 0) envWrap.setAttribute("clip-path", "url(#mg-byo-out)"); else envWrap.removeAttribute("clip-path");
        if (t < 9.8) env.g.setAttribute("opacity", 0);
        else if (f <= 0) { const m = bk(e0, 1.0); tf(env.g, A0[0] + (A[0] - A0[0]) * m, A[1], 1, -6 * oc(e0)); env.g.setAttribute("opacity", 1); }
        else {
          const [x, y] = qb(A, C, B, p), ang = qa(A, C, B, p);
          const rot = f < 1 ? -6 + (ang * 0.25) * Math.sin(Math.PI * f) + 14 * p : 8;
          tf(env.g, x, y + (f >= 1 ? bob : 0), f < 1 ? 1 + 0.22 * Math.sin(Math.PI * p) : 1, rot);
          env.g.setAttribute("opacity", 1);
        }
        const q = squash(land);
        env.inner.setAttribute("transform", `translate(0 14) scale(${1 + q} ${1 - q}) translate(0 -14)`);
        trail.forEach((d) => d.n.setAttribute("opacity", f >= d.p ? 0.9 : 0));

        /* tile: in early, lights up when the envelope lands */
        const te = seg(t, 0.95, 1.5), lk = seg(t, 11.0, 11.35), th = dip(seg(t, 11.0, 11.4));
        tf(tile, TC[0], TC[1] + 18 * (1 - oc(te)), (0.75 + 0.25 * ob(te)) * (1 + 0.04 * th));
        tile.setAttribute("opacity", seg(te, 0, 0.3));
        tfm.head.setAttribute("fill", mix(SOFT, YEL, lk));
        tfm.dots.forEach((D, j) => tf(D.d, D.x, D.y, ob(seg(t, 0.95 + j * 0.08, 1.25 + j * 0.08))));
        const tb = seg(t, 11.0, 11.7);
        tBurst.setAttribute("transform", `scale(${1 + 0.2 * tb} ${1 + 0.35 * tb})`); tBurst.setAttribute("opacity", tb > 0 && tb < 1 ? 1 - tb : 0);
        const gl = breathe(t, END, 2.1) * settle;
        tGlow.setAttribute("opacity", lk * (0.3 + 0.35 * gl));
        bars.forEach((B2, j) => B2.n.setAttribute("width", B2.w * oc(seg(t, 11.2 + j * 0.14, 11.6 + j * 0.14))));
        tCur.setAttribute("x", -70 + 76 + 8);
        tCur.setAttribute("y", 31);
        tCur.setAttribute("opacity", t > 11.8 && blink(t, END) ? 1 : 0);

        const be = seg(t, 0.9, 1.35), bp = api.calm ? 0 : dip(seg(now, press, press + 0.3));
        tf(btn.g, 772 - btn.w / 2, 50 - 12 * (1 - ob(be))); btn.g.setAttribute("opacity", seg(be, 0, 0.4));
        btn.body.setAttribute("transform", `translate(0 ${3 * bp}) scale(${1 - 0.05 * bp})`);
      };
    },
  };

  /* ---- 2. three gh commands feed three sections of a morning brief ---- */
  SC.brief = {
    dur: 12, still: 12,
    build(svg, api) {
      const END = 12, ALL = 8.7, AUTO = 9.0;
      const hintT = hint(svg, "Tap a section");
      const defs = el("defs", {}, svg);

      /* ribbons sit under the terminal and the card */
      const ribL = el("g", {}, svg);
      const CY = [206, 292, 378];
      const S = [
        ["gh pr list", "Pull requests:", "3 waiting for review", "Oldest waiting 2 days", BLUE, 2.0, 2.75],
        ["gh run list", "Checks:", "1 failing on main", "Test job, last commit", YEL, 4.15, 4.95],
        ["gh issue list", "Issues:", "2 new since yesterday", "1 labelled bug", LIL, 6.3, 7.2],
      ];
      const ribs = S.map(([, , , , c]) => {
        const g = el("g", {}, ribL);
        const o = el("path", { stroke: INK, "stroke-width": 15, fill: "none", "stroke-linecap": "butt" }, g);
        const m = el("path", { stroke: c, "stroke-width": 10, fill: "none", "stroke-linecap": "butt" }, g);
        const f = el("path", { stroke: "#fff", "stroke-width": 3, fill: "none", "stroke-dasharray": "3 13", "stroke-linecap": "round", opacity: 0 }, g);
        return { g, o, m, f };
      });

      /* terminal */
      const term = el("g", {}, svg);
      const tm = termFrame(term, 36, 96, 280, 382, SKY, 16, 34);
      const cmds = S.map(([s, , , , , a, b], i) => {
        const y = CY[i];
        const ps = mono(term, 56, y, "$", { "font-size": 19, fill: MUTE, opacity: 0 });
        const n = mono(term, 80, y, "", { "font-size": 19 });
        n.textContent = s; const cw = n.getComputedTextLength() / s.length; n.textContent = "";
        const out = [[80, 70 + i * 14], [80 + 78 + i * 14, 54 - i * 6]].map(([x, w]) => ({ n: el("rect", { x, y: y + 15, width: 0, height: 8, rx: 4, fill: GREY }, term), w }));
        return { ps, n, s, cw, a, b, y, out };
      });
      const lastPs = mono(term, 56, 450, "$", { "font-size": 19, fill: MUTE, opacity: 0 });
      const tCur = el("rect", { width: 10, height: 20, rx: 1.5, fill: INK }, term);

      /* the brief card: a title panel, then two panels that unfold downwards */
      const card = el("g", {}, svg);
      const X0 = 420, X1 = 764, Y0 = 96, P1 = 170, P2 = 324, Y1 = 478;
      const p1 = el("path", { d: `M${X0} ${P1} V${Y0 + 18} A18 18 0 0 1 ${X0 + 18} ${Y0} H${X1 - 18} A18 18 0 0 1 ${X1} ${Y0 + 18} V${P1} Z`, fill: "#fff" }, card);
      const flap = (y0, y1, last) => {
        const g = el("g", {}, card), h = y1 - y0;
        const d = `M${X0} ${y0} H${X1} V${y1 - 18} A18 18 0 0 1 ${X1 - 18} ${y1} H${X0 + 18} A18 18 0 0 1 ${X0} ${y1 - 18} Z`;
        el("path", { d, fill: "#fff" }, g);
        const shade = el("path", { d, fill: LIL_SOFT, opacity: 0 }, g);
        const edge = el("path", { d, fill: "none", stroke: INK, "stroke-width": 2.5, opacity: 0 }, g);
        return { g, shade, edge, y0, h };
      };
      const f2 = flap(P1, P2, false), f3 = flap(P2, Y1, true);
      const crease = [P1, P2].map((y) => el("path", { d: `M${X0 + 10} ${y} H${X1 - 10}`, stroke: GREY, "stroke-width": 2, "stroke-dasharray": "5 6", opacity: 0 }, card));
      const outline = el("rect", { x: X0, y: Y0, width: X1 - X0, rx: 18, fill: "none", stroke: INK, "stroke-width": 3 }, card);
      const ctitle = txt(card, 446, 143, "Morning brief", { "font-size": 25, "font-weight": 700 });
      const csun = el("g", {}, card);
      for (let i = 0; i < 8; i++) { const an = (i * Math.PI) / 4; el("path", { d: `M${(Math.cos(an) * 13).toFixed(2)} ${(Math.sin(an) * 13).toFixed(2)} L${(Math.cos(an) * 18).toFixed(2)} ${(Math.sin(an) * 18).toFixed(2)}`, stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round" }, csun); }
      el("circle", { r: 9, fill: YEL, stroke: INK, "stroke-width": 2.5 }, csun);
      const cap = txt(svg, (X0 + X1) / 2, 524, "Example numbers", { "text-anchor": "middle", "font-size": 16, "font-weight": 500, fill: MUTE });

      /* sections */
      const H0 = 76, HX = 32, GAP = 10, TOP = 184;
      let pinned = -1, snap = [0, 0, 0], pickAt = -99, lastT = 0, ev = [0, 0, 0];
      const secs = S.map(([, head, val, more, c], i) => {
        const g = el("g", {}, svg), body = el("g", {}, g);
        const cp = el("clipPath", { id: `mg-byo-sec${i}` }, defs), cr = el("rect", { x: 430, width: 324 }, cp);
        const halo = el("rect", { x: 436, width: 312, rx: 14, fill: "none", stroke: c, "stroke-width": 5, opacity: 0 }, g);
        const bg = el("rect", { x: 436, width: 312, rx: 14, fill: "#fff", stroke: INK, "stroke-width": 2 }, body);
        const inner = el("g", { "clip-path": `url(#mg-byo-sec${i})` }, body);
        const dot = el("circle", { r: 8, fill: c, stroke: INK, "stroke-width": 2 }, inner);
        const hd = txt(inner, 476, 0, head, { "font-size": 19, "font-weight": 700 });
        const vl = txt(inner, 476, 0, val, { "font-size": 19, "font-weight": 500 });
        const arrow = el("path", { stroke: MUTE, "stroke-width": 2.5, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, inner);
        const mo = txt(inner, 500, 0, more, { "font-size": 17, "font-weight": 500, fill: MUTE });
        const ring = el("rect", { x: 430, width: 324, rx: 18, fill: "none", stroke: INK, "stroke-width": 2, "stroke-dasharray": "4 5", class: "mg-ring" }, body);
        const pick = () => {
          if (pinned === i && lastT >= ALL) return;
          snap = ev.slice(); pickAt = api.now(); pinned = i;
          if (lastT < ALL) api.seek(ALL); else api.poke();
        };
        button(g, `${head} ${val}. ${more}`, pick);
        g.addEventListener("focus", pick);
        return { g, body, cr, halo, bg, dot, hd, vl, arrow, mo, ring, c, at: S[i][6] + 0.75 };
      });

      return (t, now) => {
        if (t < lastT - 0.5) { pinned = -1; snap = [0, 0, 0]; }
        lastT = t;
        hintT.setAttribute("opacity", seg(t, 2.0, 2.4));
        const te = seg(t, 0.2, 0.75);
        term.setAttribute("transform", `translate(${-24 * (1 - oc(te))} 0)`); term.setAttribute("opacity", seg(te, 0, 0.35));
        tm.dots.forEach((D, j) => tf(D.d, D.x, D.y, ob(seg(t, 0.55 + j * 0.08, 0.9 + j * 0.08))));

        /* the card arrives folded, then unfolds twice */
        const ce = seg(t, 0.35, 0.85);
        card.setAttribute("transform", `translate(0 ${18 * (1 - oc(ce))})`); card.setAttribute("opacity", seg(ce, 0, 0.35));
        const k2 = bk(seg(t, 0.95, 1.45), 1.2), k3 = bk(seg(t, 1.3, 1.8), 1.2);
        [[f2, k2], [f3, k3]].forEach(([F, k]) => {
          F.g.setAttribute("transform", `translate(0 ${F.y0}) scale(1 ${Math.max(0.001, k)}) translate(0 ${-F.y0})`);
          F.g.setAttribute("opacity", k > 0.01 ? 1 : 0);
          F.shade.setAttribute("opacity", 0.9 * (1 - cl(k)));
          F.edge.setAttribute("opacity", k > 0.01 && k < 0.98 ? 1 : 0);
        });
        crease.forEach((n, i) => { const k = i ? k3 : k2; n.setAttribute("opacity", k > 0.05 ? 1 - seg(t, 1.9 + i * 0.1, 2.4 + i * 0.1) : 0); });
        outline.setAttribute("height", (P1 - Y0) + (P2 - P1) * Math.max(0, k2) + (Y1 - P2) * Math.max(0, k3));
        tf(csun, 738, 134, ob(seg(t, 0.7, 1.1)), 40 * breathe(t, END, 6) * seg(t, 9.6, 10));
        cap.setAttribute("opacity", seg(t, 1.8, 2.2));

        /* commands type, output appears, a ribbon runs to its section */
        let cx = 80, cy = CY[0], typing = false;
        cmds.forEach((C, i) => {
          C.ps.setAttribute("opacity", seg(t, C.a - 0.35, C.a - 0.15));
          const k = type(C.n, C.s, t, C.a, C.b);
          if (t >= C.a - 0.35) { cx = 80 + k * C.cw; cy = C.y; }
          if (t >= C.a && t < C.b + 0.05) typing = true;
          C.out.forEach((O, j) => O.n.setAttribute("width", O.w * oc(seg(t, C.b + 0.12 + j * 0.08, C.b + 0.4 + j * 0.08))));
        });
        const lastIn = cmds[2].b + 0.6;
        lastPs.setAttribute("opacity", seg(t, lastIn, lastIn + 0.2));
        if (t >= lastIn) { cx = 80; cy = 450; }
        tCur.setAttribute("x", cx + 2); tCur.setAttribute("y", cy - 16);
        tCur.setAttribute("opacity", te > 0.6 && (typing || blink(t, END)) ? 1 : 0);

        /* expansion: autoplay opens Checks, a tap or focus opens another */
        const target = [0, 1, 2].map((i) => (pinned >= 0 ? (i === pinned ? 1 : 0) : (i === 1 ? 1 : 0)));
        if (pinned >= 0) { const k = api.calm ? 1 : io(seg(now - pickAt, 0, 0.38)); ev = snap.map((s, i) => s + (target[i] - s) * k); }
        else ev = [0, io(seg(t, AUTO, AUTO + 0.45)), 0];
        let y = TOP;
        secs.forEach((Sc, i) => {
          const h = H0 + HX * ev[i];
          const sk = seg(t, Sc.at, Sc.at + 0.5), on = sk > 0;
          [Sc.bg, Sc.halo].forEach((n) => { n.setAttribute("y", y); n.setAttribute("height", h); });
          Sc.cr.setAttribute("y", y + 2); Sc.cr.setAttribute("height", h - 4);
          Sc.ring.setAttribute("y", y - 6); Sc.ring.setAttribute("height", h + 12);
          Sc.bg.setAttribute("fill", mix("#FFFFFF", Sc.c, 0.2 * ev[i]));
          Sc.body.setAttribute("transform", `translate(436 ${y + h / 2}) scale(${0.92 + 0.08 * ob(sk)} ${0.8 + 0.2 * ob(sk)}) translate(-436 ${-(y + h / 2)})`);
          Sc.g.setAttribute("opacity", on ? seg(sk, 0, 0.3) : 0);
          const hk = seg(t, Sc.at + 0.02, Sc.at + 0.42), vk = seg(t, Sc.at + 0.11, Sc.at + 0.51);
          Sc.hd.setAttribute("y", y + 32 + 10 * (1 - oc(hk))); Sc.hd.setAttribute("opacity", seg(hk, 0, 0.5));
          Sc.vl.setAttribute("y", y + 60 + 10 * (1 - oc(vk))); Sc.vl.setAttribute("opacity", seg(vk, 0, 0.5));
          tf(Sc.dot, 458, y + 25, ob(seg(t, Sc.at, Sc.at + 0.35)));
          const mk = seg(ev[i], 0.35, 1);
          Sc.arrow.setAttribute("d", `M480 ${y + 74} V${y + 84} H490`); Sc.arrow.setAttribute("opacity", mk);
          Sc.mo.setAttribute("y", y + 90 + 6 * (1 - mk)); Sc.mo.setAttribute("opacity", mk);
          const hb = seg(t, Sc.at, Sc.at + 0.6);
          Sc.halo.setAttribute("opacity", hb > 0 && hb < 1 ? 1 - hb : 0);
          Sc.halo.setAttribute("transform", `translate(592 ${y + h / 2}) scale(${1 + 0.05 * hb} ${1 + 0.25 * hb}) translate(-592 ${-(y + h / 2)})`);
          Sc.ty = y + 38;
          y += h + GAP;
        });

        /* ribbons follow their section */
        const flow = seg(t, 9.4, 9.9);
        ribs.forEach((Rb, i) => {
          const y0 = CY[i] + 6, y1 = secs[i].ty, d = `M300 ${y0} C362 ${y0}, 372 ${y1}, 436 ${y1}`;
          [Rb.o, Rb.m, Rb.f].forEach((n) => n.setAttribute("d", d));
          const L = Rb.m.getTotalLength(), g = io(seg(t, S[i][6] + 0.1, S[i][6] + 0.8));
          [Rb.o, Rb.m].forEach((n) => { n.setAttribute("stroke-dasharray", `${L} ${L}`); n.setAttribute("stroke-dashoffset", L * (1 - g)); });
          Rb.g.setAttribute("opacity", g > 0 ? 1 : 0);
          Rb.f.setAttribute("stroke-dashoffset", -((t - END) * 26) % 16);
          Rb.f.setAttribute("opacity", 0.85 * flow);
        });
      };
    },
  };

  /* ---- 3. a thread message goes to the orchestrator, a temp worker replies and folds away ---- */
  SC.thread = {
    dur: 12, still: 12,
    build(svg, api) {
      const END = 12, SEND = 2.8, RP = 2.7;
      const hintT = hint(svg, "Tap Send");
      const MSG = "Fix the failing check on main", REP = "Fix ready for review";

      /* the thread panel */
      const panel = el("g", {}, svg);
      el("rect", { x: 36, y: 112, width: 432, height: 444, rx: 22, fill: "#fff", stroke: INK, "stroke-width": 3 }, panel);
      el("path", { d: "M36 174 H468", stroke: INK, "stroke-width": 2.5 }, panel);
      const ttl = txt(svg, 60, 154, "#standup", { "font-size": 23, "font-weight": 700 });

      /* the message from You */
      const m1 = el("g", {}, svg);
      const m1mk = el("g", {}, m1); el("rect", { x: -15, y: -15, width: 30, height: 30, rx: 9, fill: BLUE, stroke: INK, "stroke-width": 2.5 }, m1mk); tf(m1mk, 71, 285);
      const m1n = txt(m1, 100, 292, "You", { "font-size": 19, "font-weight": 700 });
      const m1t = fit(txt(m1, 100, 323, MSG, { "font-size": 19, "font-weight": 500 }), 348);
      const msgEnd = 100 + m1t.getComputedTextLength();
      const m1bg = el("rect", { x: 48, y: 262, width: 408, height: 76, rx: 12, fill: SKY, opacity: 0 }, svg);
      svg.insertBefore(m1bg, m1);

      /* the threaded reply */
      const conn = el("path", { d: "M71 306 V352 Q71 372 91 372 H104", stroke: GREY, "stroke-width": 3, fill: "none", "stroke-linecap": "round" }, svg);
      const CL = 46 + 31.4 + 13;
      const r1 = el("g", {}, svg);
      const r1mk = el("g", {}, r1); el("rect", { x: -13, y: -13, width: 26, height: 26, rx: 8, fill: "#fff", stroke: INK, "stroke-width": 2.5, "stroke-dasharray": "4 3" }, r1mk); tf(r1mk, 119, 372);
      const r1n = txt(r1, 142, 379, "temp worker", { "font-size": 18, "font-weight": 700, fill: MUTE });
      const r1t = txt(r1, 142, 409, REP, { "font-size": 19, "font-weight": 500 });
      const r1bg = el("rect", { x: 96, y: 350, width: 360, height: 74, rx: 12, fill: MINT, opacity: 0 }, svg);
      svg.insertBefore(r1bg, r1);

      /* composer */
      const comp = el("g", {}, svg);
      el("rect", { x: 52, y: 472, width: 300, height: 52, rx: 14, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, comp);
      const ct = fit(txt(comp, 66, 504, MSG, { "font-size": 17, "font-weight": 500 }), 270);
      const cCur = el("rect", { width: 2.5, height: 22, fill: INK }, comp);
      const btn = mkBtn(svg, "Send", 18);

      /* Michael, the orchestrator */
      const MC = [640, 200];
      const mich = el("g", {}, svg), mBody = el("g", {}, mich);
      const mHalo = el("rect", { x: -125, y: -42, width: 250, height: 84, rx: 20, fill: "none", stroke: YEL, "stroke-width": 6, opacity: 0 }, mich);
      el("rect", { x: -125, y: -42, width: 250, height: 84, rx: 20, fill: BLUE, stroke: INK, "stroke-width": 3 }, mBody);
      const hub = el("g", {}, mBody);
      [[-96, -14], [-96, 14], [-74, 0]].forEach(([x, y], i) => { if (i < 2) el("path", { d: `M${x} ${y} L-74 0`, stroke: INK, "stroke-width": 2.5 }, hub); });
      [[-96, -14], [-96, 14]].forEach(([x, y]) => el("circle", { cx: x, cy: y, r: 5.5, fill: "#fff", stroke: INK, "stroke-width": 2.2 }, hub));
      el("circle", { cx: -74, cy: 0, r: 8, fill: YEL, stroke: INK, "stroke-width": 2.5 }, hub);
      fit(txt(mBody, -52, -3, "Michael", { "font-size": 23, "font-weight": 700 }), 160);
      fit(txt(mBody, -52, 23, "(orchestrator)", { "font-size": 17, "font-weight": 600 }), 160);
      const mDot = el("circle", { cx: 106, cy: -24, r: 6, fill: MINT, stroke: INK, "stroke-width": 2 }, mBody);

      /* the temp worker, its link, and the outline it leaves */
      const TC = [640, 404], TW = 196, TH = 100;
      const ghost = el("rect", { x: TC[0] - TW / 2, y: TC[1] - TH / 2, width: TW, height: TH, rx: 14, fill: "none", stroke: MUTE, "stroke-width": 2, "stroke-dasharray": "7 7", opacity: 0 }, svg);
      const link = el("path", { stroke: MUTE, "stroke-width": 2.5, "stroke-dasharray": "3 7", "stroke-linecap": "round", fill: "none" }, svg);
      const tile = el("g", {}, svg), tIn = el("g", {}, tile);
      el("rect", { x: -TW / 2, y: -TH / 2, width: TW, height: TH, rx: 14, fill: "#fff", stroke: INK, "stroke-width": 2.5, "stroke-dasharray": "8 6" }, tIn);
      const tShade = el("rect", { x: -TW / 2, y: -TH / 2, width: TW, height: TH, rx: 14, fill: LIL_SOFT, opacity: 0 }, tIn);
      const tBody = el("g", {}, tIn);
      fit(mono(tBody, 0, -10, "temp worker", { "text-anchor": "middle", "font-size": 18, "font-weight": 700 }), 170);
      el("rect", { x: -74, y: 12, width: 148, height: 16, rx: 8, fill: SOFT, stroke: INK, "stroke-width": 2 }, tBody);
      const bar = el("rect", { x: -74, y: 12, width: 0, height: 16, rx: 8, fill: MINT, stroke: INK, "stroke-width": 2 }, tBody);

      /* envelopes */
      const A1 = [Math.min(440, msgEnd + 34), 316], C1 = [500, 330], B1 = [514, 202];
      const A2 = [540, 404], C2 = [470, 470], B2 = [404, 398];
      const e1 = mkEnv(svg), e2 = mkEnv(svg, MINT);

      let press = -99;
      button(btn.g, "Send the message again", () => { press = api.now(); api.seek(RP); });

      return (t, now) => {
        const pe = seg(t, 0.15, 0.7);
        rise(panel, pe, 22);
        rise(ttl, seg(t, 0.3, 0.75), 12);
        hintT.setAttribute("opacity", seg(t, 1.0, 1.4));
        const coe = seg(t, 0.45, 0.9);
        rise(comp, coe, 14);
        const be = seg(t, 0.55, 1.0), pd = Math.max(dip(seg(t, SEND, SEND + 0.3)), api.calm ? 0 : dip(seg(now, press, press + 0.3)));
        tf(btn.g, 410, 498 + 12 * (1 - ob(be))); btn.g.setAttribute("opacity", seg(be, 0, 0.4));
        btn.body.setAttribute("transform", `translate(0 ${3 * pd}) scale(${1 - 0.06 * pd})`);

        /* typing in the composer, then the text lifts into the thread */
        type(ct, MSG, t, 1.2, 2.6);
        const gone = seg(t, SEND + 0.02, SEND + 0.2);
        ct.setAttribute("opacity", 1 - gone); ct.setAttribute("transform", `translate(0 ${-10 * gone})`);
        if (gone >= 1) ct.textContent = "";
        const cw = gone >= 1 ? 0 : ct.getComputedTextLength();
        cCur.setAttribute("x", 66 + cw + 2); cCur.setAttribute("y", 486);
        const typing = t >= 1.2 && t < 2.62;
        cCur.setAttribute("opacity", coe > 0.6 && (gone > 0 && gone < 1 ? 0 : typing || blink(t, END, 1.0)) ? 1 : 0);

        const mk = seg(t, SEND + 0.05, SEND + 0.5), nk = seg(t, SEND + 0.12, SEND + 0.55), tk = seg(t, SEND + 0.2, SEND + 0.65);
        tf(m1mk, 71, 285, ob(mk)); m1mk.setAttribute("opacity", mk > 0 ? 1 : 0);
        [[m1n, nk], [m1t, tk]].forEach(([n, kk]) => { n.setAttribute("opacity", seg(kk, 0, 0.4)); n.setAttribute("transform", `translate(0 ${26 * (1 - oc(kk))})`); });
        const fl = seg(t, SEND + 0.1, SEND + 1.3);
        m1bg.setAttribute("opacity", fl > 0 && fl < 1 ? 0.35 * (1 - fl) : 0);

        /* envelope one: message to Michael */
        const s1 = seg(t, 3.55, 3.8), f1 = seg(t, 3.75, 4.6);
        if (t < 3.55 || f1 >= 1) e1.g.setAttribute("opacity", 0);
        else {
          const p = io(f1), [x, y] = f1 > 0 ? qb(A1, C1, B1, p) : A1;
          tf(e1.g, x, y, (0.2 + 0.8 * ob(s1)) * (1 + 0.2 * Math.sin(Math.PI * p)) * (1 - 0.4 * seg(f1, 0.85, 1)), -8 + 18 * Math.sin(Math.PI * p));
          e1.g.setAttribute("opacity", 1 - seg(f1, 0.9, 1));
        }

        /* Michael: in, takes the envelope, then breathes */
        const me = seg(t, 0.7, 1.2), hit = seg(t, 4.55, 5.0), q = squash(hit);
        const settle = seg(t, 9.8, 10.3), bob = -3 * Math.sin((2 * Math.PI * (t - END)) / 2.2) * settle;
        tf(mich, MC[0], MC[1] + 16 * (1 - oc(me)) + bob, 0.6 + 0.4 * ob(me));
        mich.setAttribute("opacity", seg(me, 0, 0.3));
        mBody.setAttribute("transform", `scale(${1 + q} ${1 - q})`);
        const mh = seg(t, 4.6, 5.3);
        mHalo.setAttribute("opacity", mh > 0 && mh < 1 ? 1 - mh : 0); mHalo.setAttribute("transform", `scale(${1 + 0.12 * mh} ${1 + 0.3 * mh})`);
        mDot.setAttribute("opacity", t < 4.6 || blink(t, END, 1.1) || t < 9.8 ? 1 : 0.25);

        /* the temp worker pops out of Michael */
        const sp = seg(t, 4.95, 5.5), spE = ob(sp), fo = seg(t, 8.75, 9.4);
        const ty = MC[1] + 30 + (TC[1] - MC[1] - 30) * oc(sp), ts = 0.3 + 0.7 * spE;
        tf(tile, TC[0], ty, ts);
        tile.setAttribute("opacity", sp > 0 && fo < 1 ? seg(sp, 0, 0.2) * (1 - seg(fo, 0.75, 1)) : 0);
        const fy = io(fo);
        tIn.setAttribute("transform", `translate(0 ${-TH / 2}) scale(${1 - 0.12 * fy} ${Math.max(0.02, 1 - fy)}) translate(0 ${TH / 2})`);
        tShade.setAttribute("opacity", 0.9 * fy);
        tBody.setAttribute("opacity", 1 - seg(fo, 0, 0.3));
        bar.setAttribute("width", 148 * (0.42 * oc(seg(t, 5.65, 6.25)) + 0.58 * oc(seg(t, 6.45, 7.15))));
        bar.setAttribute("fill", mix(MINT, "#B5ECD2", dip(seg(t, 7.15, 7.45))));
        const top = ty - (TH / 2) * ts, lk = sp > 0 ? 1 - seg(fo, 0, 0.6) : 0;
        link.setAttribute("d", `M${MC[0]} ${MC[1] + 44 + bob} V${Math.max(MC[1] + 44 + bob, top - 2)}`);
        link.setAttribute("opacity", lk);
        ghost.setAttribute("opacity", 0.55 * seg(fo, 0.5, 1));

        /* envelope two: the worker's reply back into the thread */
        const s2 = seg(t, 7.3, 7.5), f2 = seg(t, 7.45, 8.25);
        if (t < 7.3 || f2 >= 1) e2.g.setAttribute("opacity", 0);
        else {
          const p = io(f2), [x, y] = f2 > 0 ? qb(A2, C2, B2, p) : A2;
          tf(e2.g, x, y, (0.2 + 0.8 * ob(s2)) * (1 + 0.2 * Math.sin(Math.PI * p)) * (1 - 0.4 * seg(f2, 0.8, 1)), 8 - 18 * Math.sin(Math.PI * p));
          e2.g.setAttribute("opacity", 1 - seg(f2, 0.85, 1));
        }
        const cn = oc(seg(t, 8.05, 8.45));
        conn.setAttribute("stroke-dasharray", `${CL} ${CL}`); conn.setAttribute("stroke-dashoffset", CL * (1 - cn)); conn.setAttribute("opacity", cn > 0 ? 1 : 0);
        const rk = seg(t, 8.2, 8.6), rn = seg(t, 8.28, 8.7), rt = seg(t, 8.36, 8.8);
        tf(r1mk, 119, 372, ob(rk)); r1mk.setAttribute("opacity", rk > 0 ? 1 : 0);
        [[r1n, rn], [r1t, rt]].forEach(([n, kk]) => { n.setAttribute("opacity", seg(kk, 0, 0.4)); n.setAttribute("transform", `translate(${-12 * (1 - oc(kk))} 0)`); });
        const rf = seg(t, 8.25, 9.6);
        r1bg.setAttribute("opacity", rf > 0 && rf < 1 ? 0.35 * (1 - rf) : 0);
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
