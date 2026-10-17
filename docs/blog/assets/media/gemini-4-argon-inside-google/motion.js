/* Bright coded scenes for "Gemini 4 Argon Inside Google". Vanilla JS, no library.
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
  /* a wobble that dies away, for things that have just landed */
  const spr = (tau, a, d, f) => (tau > 0 ? a * Math.exp(-d * tau) * Math.sin(f * tau) : 0);
  const pop = (t, a, c = 1.8) => cl(bk(seg(t, a, a + 0.45), c), 0, 1.3);
  /* scene heading on the left, the tap hint on the right; the heading shrinks if the two would touch */
  const head = (svg, s, hint) => {
    const a = txt(svg, 44, 62, s, { "font-size": 32, "font-weight": 700 });
    const b = txt(svg, 756, 60, hint, { "text-anchor": "end", "font-size": 20, fill: MUTE, "font-weight": 500 });
    const room = 756 - b.getComputedTextLength() - 28 - 44, w = a.getComputedTextLength();
    if (w > room) a.setAttribute("font-size", Math.floor((32 * room) / w));
  };
  const star = (p, x, y, r, fill) => el("path", { d: `M0 ${-r} Q0 0 ${r} 0 Q0 0 0 ${r} Q0 0 ${-r} 0 Q0 0 0 ${-r} Z`, fill, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round", transform: `translate(${x} ${y})` }, p);
  /* a line of text never wider than max */
  const fit = (n, max) => { const w = n.getComputedTextLength(); if (w > max) n.setAttribute("font-size", Math.max(15, Math.floor((parseFloat(n.getAttribute("font-size")) * max) / w))); return n; };
  const say = (cap, s) => { if (cap.textContent === s) return; cap.textContent = s; cap.setAttribute("font-size", 20); fit(cap, 696); };
  const card = (p, cx, y, w, h, fill = "#fff") => { const g = el("g", {}, p); el("rect", { x: -w / 2, y: 0, width: w, height: h, rx: 14, fill, stroke: INK, "stroke-width": 3 }, g); tf(g, cx, y); return g; };
  const ctx = (g, y, s, size, a = {}) => txt(g, 0, y, s, Object.assign({ "text-anchor": "middle", "font-size": size, "font-weight": 700 }, a));
  const desk = (svg) => el("path", { d: "M30 478 H770", stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, svg);

  const SC = {};

  /* ---- 1. a tall stack of slips; most flutter into the paper bin, the rest slide into a neat rack ---- */
  SC.backlog = {
    dur: 13, still: 10.6,
    build(svg, api) {
      head(svg, "What did it do to the bug backlog?", "tap the tray");
      const SX = 144, RX = 372, BX = 640, N = 14, NB = 10;
      const DX = [3, -4, 2, 4, -3, 1, -4, 3, -2, 4, -1, 3, -3, 1], DR = [0.5, -1.1, 0.8, 1.4, -1, 0.4, -1.5, 1.1, -0.7, 1.3, -0.5, 1, -1.2, 0.5];
      const TY = [316, 364, 412, 460], TC = [YEL, SKY, LIL, MINT], sy = (i) => 444 - i * 13;
      desk(svg);
      /* nobody has dusted beside this tray for a while */
      const WA = [0, 30, 60, 90].map((a) => (a * Math.PI) / 180), WP = (r, a) => `${(235 + r * Math.cos(a)).toFixed(1)} ${(474 - r * Math.sin(a)).toFixed(1)}`;
      let wd = "";
      WA.forEach((a) => (wd += `M235 474 L${WP(42, a)} `));
      [16, 30].forEach((r) => { wd += `M${WP(r, WA[0])} `; for (let i = 1; i < 4; i++) wd += `Q${WP(r * 0.78, (WA[i - 1] + WA[i]) / 2)} ${WP(r, WA[i])} `; });
      el("path", { d: wd, stroke: LIL, "stroke-width": 2, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, svg);
      const rack = el("g", {}, svg);
      const tabs = TY.map((y, j) => {
        el("rect", { x: 282, y, width: 220, height: 8, rx: 4, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, rack);
        const g = el("g", {}, rack);
        el("rect", { x: -13, y: -22, width: 26, height: 22, rx: 5, fill: TC[j], stroke: INK, "stroke-width": 2.5 }, g);
        return g;
      });
      [278, 498].forEach((x) => el("rect", { x, y: 286, width: 8, height: 190, rx: 4, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, rack));
      const c134 = card(svg, SX, 104, 200, 86);
      ctx(c134, 44, "134", 40); ctx(c134, 72, "open bug reports", 20, { "font-weight": 600 });
      const c37 = card(svg, 392, 104, 220, 86, YEL);
      ctx(c37, 44, "37", 40); ctx(c37, 72, "sorted by owner", 20, { "font-weight": 600 });
      const ck = card(svg, BX, 104, 200, 86);
      el("circle", { cx: -62, cy: 43, r: 27, fill: SKY, stroke: INK, "stroke-width": 3 }, ck);
      el("path", { d: "M-62 20 v5 M-62 61 v5 M-85 43 h5 M-44 43 h5", stroke: INK, "stroke-width": 2, "stroke-linecap": "round" }, ck);
      const hh = el("path", { d: "M0 0 V-12", stroke: INK, "stroke-width": 4, "stroke-linecap": "round" }, ck), mh = el("path", { d: "M0 0 V-19", stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round" }, ck);
      el("circle", { cx: -62, cy: 43, r: 3, fill: INK }, ck);
      txt(ck, -22, 36, "under", { "font-size": 20, "font-weight": 500, fill: MUTE });
      txt(ck, -22, 66, "3 hours", { "font-size": 26, "font-weight": 700 });
      const tray = el("g", {}, svg);
      el("rect", { x: 40, y: 250, width: 208, height: 236, rx: 16, fill: "#fff", "fill-opacity": 0, stroke: INK, "stroke-width": 2, class: "mg-ring" }, tray);
      const ghost = el("rect", { x: 67, y: 266, width: 154, height: 186, rx: 6, fill: "none", stroke: LIL, "stroke-width": 2, "stroke-dasharray": "2 8", "stroke-linecap": "round" }, tray);
      [56, 224].forEach((x) => el("rect", { x, y: 262, width: 8, height: 214, rx: 4, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, tray));
      el("rect", { x: 52, y: 452, width: 184, height: 24, rx: 8, fill: BLUE, stroke: INK, "stroke-width": 3 }, tray);
      const slips = DX.map(() => {
        const g = el("g", {}, tray);
        el("rect", { x: -73, y: -6, width: 146, height: 12, rx: 3, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, g);
        el("path", { d: "M-58 0 H-10", stroke: LIL, "stroke-width": 3, "stroke-linecap": "round" }, g);
        el("circle", { cx: 56, cy: 0, r: 2.5, fill: INK }, g);
        return g;
      });
      const bin = el("g", {}, svg);
      el("path", { d: "M565 308 H715 L698 476 H582 Z", fill: MINT, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, bin);
      el("rect", { x: 557, y: 298, width: 166, height: 18, rx: 9, fill: MINT, stroke: INK, "stroke-width": 3 }, bin);
      const rec = el("g", {}, bin);
      for (let i = 0; i < 3; i++) el("path", { d: "M0 -13 A13 13 0 0 1 12.9 -1.1 M12.9 -1.1 l-6 -4 M12.9 -1.1 l4.5 -6", stroke: INK, "stroke-width": 2.5, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round", transform: `rotate(${i * 120})` }, rec);
      const cnt = el("g", {}, bin);
      el("rect", { x: -52, y: -38, width: 104, height: 76, rx: 12, fill: "#fff", stroke: INK, "stroke-width": 3 }, cnt);
      const num = txt(cnt, 0, -2, "97", { "text-anchor": "middle", "font-size": 34, "font-weight": 700, "font-family": MONO });
      txt(cnt, 0, 26, "closed", { "text-anchor": "middle", "font-size": 20, "font-weight": 600 });
      button(tray, "Run the bug backlog again", () => api.seek(0.9));
      const cap = strip(svg, 508, 740);
      return (t, now) => {
        const out = io(seg(t, 12.2, 12.6));
        let got = 0, gulp = 0;
        slips.forEach((s, i) => {
          const x0 = SX + DX[i], y0 = sy(i);
          let x = x0, y = y0, r = DR[i], sc = 1, op = 1;
          if (i >= N - NB) {
            const a = 1.2 + (N - 1 - i) * 0.5, p = seg(t, a, a + 0.95), e = io(p), lift = (y0 - 236) / 0.76;
            x = lerp(x0, BX, e); y = lerp(y0, 384, e * e) - lift * Math.sin(Math.PI * p) * (1 - 0.5 * p);
            r = DR[i] * (1 - p) + 22 * Math.sin(p * 9.4) * (1 - p) * Math.min(1, p * 5) + 80 * e * e; sc = lerp(1, 0.55, e); op = p >= 0.97 ? 0 : 1;
            got += seg(t, a + 0.8, a + 1.15); gulp += spr(t - a - 0.9, 1, 7, 22);
          } else {
            const m = N - NB - 1 - i, a = 7.1 + m * 0.4, p = seg(t, a, a + 0.9);
            x = lerp(x0, RX, cl(bk(p, 0.9), 0, 1.2)); y = lerp(y0, TY[m] - 7, io(p)) - 14 * Math.sin(Math.PI * p);
            r = DR[i] * (1 - p) - 5 * Math.sin(Math.PI * p);
          }
          if (t >= 12.6) { x = x0; y = y0 - 10 * (1 - oc(seg(t, 12.6, 12.95))); r = DR[i]; sc = 1; op = seg(t, 12.6, 12.9); } else op *= 1 - out;
          tf(s, x.toFixed(2), y.toFixed(2), sc.toFixed(3), r.toFixed(2)); s.setAttribute("opacity", op.toFixed(2));
        });
        const n = String(Math.round((97 * got) / NB));
        if (num.textContent !== n) num.textContent = n;
        tf(cnt, BX, 374, (pop(t, 2.0, 2.2) * (1 - out)).toFixed(3));
        bin.setAttribute("transform", `translate(${BX} 476) scale(${(1 + 0.02 * gulp).toFixed(4)} ${(1 - 0.035 * gulp).toFixed(4)}) translate(${-BX} -476)`);
        rec.setAttribute("transform", `translate(${BX} 446) rotate(${(now * 16).toFixed(1)})`);
        ghost.setAttribute("opacity", ((got / NB) * (1 - out)).toFixed(2));
        c37.setAttribute("transform", `translate(392 ${(104 - 36 * (1 - cl(bk(seg(t, 6.6, 7.05), 1.8), 0, 1.3))).toFixed(2)})`);
        c37.setAttribute("opacity", (seg(t, 6.6, 6.75) * (1 - out)).toFixed(2));
        tabs.forEach((g, m) => tf(g, 476, TY[m], (1 + spr(t - 7.1 - m * 0.4 - 0.72, 0.3, 6, 18)).toFixed(3)));
        const cp = io(seg(t, 1.2, 9.3)) * (1 - out);
        hh.setAttribute("transform", `translate(-62 43) rotate(${(84 * cp).toFixed(1)})`); mh.setAttribute("transform", `translate(-62 43) rotate(${(1008 * cp).toFixed(1)})`);
        say(cap, t < 1.2 || t >= 12.2 ? "Google's Antigravity post, 13 Oct 2026" : t < 6.9 ? "“closed 97 stale or duplicate bugs with documented commit proof”" : t < 9.5 ? "Sorted “the remaining 37 by owner”" : "134 open bug reports, “in under 3 hours”. Google's own figures.");
      };
    },
  };

  /* ---- 2. a tangled ball of wool; two strands pull free and wind themselves into two neat balls ---- */
  SC.yarn = {
    dur: 12, still: 9.8,
    build(svg, api) {
      head(svg, "What did it change in Chrome?", "tap the wool");
      const CX = 400, CY = 358, R = 118;
      desk(svg);
      const wool = (p, fill) => {
        const g = el("g", {}, p), c = el("circle", { r: 0, fill, stroke: INK, "stroke-width": 3 }, g), w = el("path", { fill: "none", stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round" }, g);
        const arc = (r, u, rot) => {
          const a = (rot * Math.PI) / 180, co = Math.cos(a), si = Math.sin(a), x = Math.sqrt(1 - u * u) * r * 0.96, y = u * r * 0.96, by = (u + (u < 0 ? -0.34 : 0.34)) * r;
          const P = (px, py) => `${(px * co - py * si).toFixed(1)} ${(px * si + py * co).toFixed(1)}`;
          return `M${P(-x, y)} Q${P(0, by)} ${P(x, y)} `;
        };
        return { g, set: (r) => { c.setAttribute("r", Math.max(0, r).toFixed(2)); w.setAttribute("d", r < 6 ? "" : arc(r, -0.5, -32) + arc(r, 0.02, -32) + arc(r, 0.52, -32) + arc(r, -0.3, 58) + arc(r, 0.34, 58)); } };
      };
      const strand = (p, col) => {
        const a = el("path", { fill: "none", stroke: INK, "stroke-width": 7.5, "stroke-linecap": "round", "stroke-linejoin": "round", pathLength: 1 }, p), b = el("path", { fill: "none", stroke: col, "stroke-width": 3.5, "stroke-linecap": "round", "stroke-linejoin": "round", pathLength: 1 }, p);
        return {
          d: (s) => { a.setAttribute("d", s); b.setAttribute("d", s); },
          keep: (k) => { const v = `${cl(k).toFixed(4)} 2`, o = k <= 0.004 ? 0 : 1; a.setAttribute("stroke-dasharray", v); b.setAttribute("stroke-dasharray", v); a.setAttribute("opacity", o); b.setAttribute("opacity", o); },
        };
      };
      const tangle = el("g", {}, svg);
      el("circle", { cx: CX, cy: CY, r: R + 20, fill: "#fff", "fill-opacity": 0, stroke: INK, "stroke-width": 2, class: "mg-ring" }, tangle);
      /* somebody tried this by hand first and left the needles in */
      [[52, 116, -70, -152], [-92, 98, 118, -112]].forEach(([ax, ay, bx, by]) => {
        const ln = `M${CX + ax} ${CY + ay} L${CX + bx} ${CY + by}`;
        el("path", { d: ln, stroke: INK, "stroke-width": 8, "stroke-linecap": "round" }, tangle);
        el("path", { d: ln, stroke: "#fff", "stroke-width": 3, "stroke-linecap": "round" }, tangle);
        el("circle", { cx: CX + bx, cy: CY + by, r: 8, fill: YEL, stroke: INK, "stroke-width": 2.5 }, tangle);
      });
      const big = wool(tangle, LIL); big.set(R);
      const scrib = (seed, sx, sy) => {
        const pts = [[sx, sy]];
        let a = seed;
        for (let n = 1; n < 15; n++) {
          const f = Math.sin(seed * 7 + n * 12.9898) * 43758.5453, u = f - Math.floor(f);
          a += 1.55 + 0.75 * u;
          const rr = R * (1.2 + 0.5 * ((u * 7) % 1)) * (Math.sin(a) > 0.3 ? 0.78 : 1);
          pts.push([CX + rr * Math.cos(a), CY + rr * Math.sin(a)]);
        }
        let d = `M${sx} ${sy} `;
        for (let n = 1; n < pts.length - 1; n++) d += `Q${pts[n][0].toFixed(1)} ${pts[n][1].toFixed(1)} ${((pts[n][0] + pts[n + 1][0]) / 2).toFixed(1)} ${((pts[n][1] + pts[n + 1][1]) / 2).toFixed(1)} `;
        return d;
      };
      const top = card(svg, CX, 100, 300, 80);
      ctx(top, 36, "Chromium", 30); ctx(top, 64, "40 million-line codebase", 20, { "font-weight": 600 });
      const side = [[140, BLUE, 1.3, -1, ["core webpage", "handling"], 0.6], [660, YEL, 5.0, 1, ["~6 million line", "legacy folder"], 2.1]].map(([bx, col, s, d, words, seed]) => {
        const E = [CX + d * R * 0.94, CY - R * 0.3];
        const mess = strand(tangle, col); mess.d(scrib(seed, E[0], E[1]));
        const ghost = el("circle", { cx: bx, cy: 390, r: 60, fill: "none", stroke: LIL, "stroke-width": 2, "stroke-dasharray": "2 8", "stroke-linecap": "round" }, svg);
        const line = strand(svg, col), b = wool(svg, col);
        el("path", { d: `M${bx - 76} 440 H${bx + 76} Q${bx + 76} 476 ${bx + 42} 476 H${bx - 42} Q${bx - 76} 476 ${bx - 76} 440 Z`, fill: SOFT, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, svg);
        const lab = card(svg, bx, 222, 200, 80);
        ctx(lab, 34, words[0], 22); ctx(lab, 62, words[1], 22);
        return { bx, s, d, E, mess, ghost, line, b, lab };
      });
      button(tangle, "Tangle the wool again", () => api.seek(0.6));
      const cap = strip(svg, 508, 740);
      return (t, now) => {
        const out = io(seg(t, 11.2, 11.8)), e1 = Math.sin(Math.PI * seg(t, 1.5, 4.5)), e2 = Math.sin(Math.PI * seg(t, 5.2, 8.2));
        tf(big.g, (CX - 5 * e1 + 5 * e2).toFixed(2), CY, 1, ((e1 + e2) * 4 * Math.sin(t * 8) + spr(t - 8.5, 5, 3, 10) + Math.sin(now * 0.9) * 0.8).toFixed(2));
        side.forEach((sd, j) => {
          const { bx, s, d, E } = sd, p1 = seg(t, s, s + 0.6), p2 = seg(t, s + 0.6, s + 3.0), w3 = io(seg(t, s + 3.0, s + 3.5));
          const r = 60 * io(p2) * (1 - out), A = [bx - d * 0.5 * r, 450 - r - 0.87 * r];
          const near = p2 > 0 ? A : [lerp(E[0], bx, oc(p1)), lerp(E[1], 448, oc(p1))];
          const fe = [A[0] - d * 28, A[1] - 12 + Math.sin(now * 1.7 + j) * 3], far = [lerp(E[0], fe[0], w3), lerp(E[1], fe[1], w3)];
          const sag = lerp(12 + 22 * (1 - Math.sin(Math.PI * p2)), 5, w3);
          sd.line.d(`M${far[0].toFixed(1)} ${far[1].toFixed(1)} Q${((far[0] + near[0]) / 2).toFixed(1)} ${((far[1] + near[1]) / 2 + sag).toFixed(1)} ${near[0].toFixed(1)} ${near[1].toFixed(1)}`);
          sd.line.keep(t >= s && out < 0.02 ? 1 : 0);
          sd.mess.keep(Math.max(1 - io(seg(t, s + 0.2, s + 3.2)), out));
          sd.b.set(r);
          tf(sd.b.g, bx, (450 - r).toFixed(2), 1, (d * 540 * io(p2) + spr(t - s - 3.0, 10, 4, 12) + seg(t, 8.6, 9.4) * Math.sin(now * 1.3 + j * 2) * 3).toFixed(2));
          sd.ghost.setAttribute("opacity", Math.max(1 - p2 * 3, out).toFixed(2));
          tf(sd.lab, bx, 222, pop(t, 0.15 + j * 0.2).toFixed(3));
        });
        say(cap, t < 1.3 || t >= 11.2 ? "Google's launch post, 13 Oct 2026" : t < 5.0 ? "Argon helped the Chrome team separate core webpage handling" : t < 8.6 ? "from “a ~6 million line legacy folder of browser features”" : "“completing months of work in weeks”, the launch post says");
      };
    },
  };

  /* ---- 3. comment cards step past two stamps that press the same star; one stamp is retired ---- */
  SC.stamp = {
    dur: 13, still: 10.3,
    build(svg, api) {
      head(svg, "What did it change in YouTube?", "tap the stamps");
      const CYC = 1.3, CYD = 428, UP = 352, DN = 448, AX = 270, BX = 410, PKX = 548, PKY = 280;
      desk(svg);
      const cards = [0, 1, 2, 3, 4].map(() => {
        const g = el("g", {}, svg);
        el("rect", { x: -58, y: -42, width: 116, height: 84, rx: 10, fill: "#fff", stroke: INK, "stroke-width": 3 }, g);
        el("path", { d: "M-44 -18 H-4 M-44 0 H-10 M-44 18 H-22", stroke: LIL, "stroke-width": 4, "stroke-linecap": "round" }, g);
        const sg = el("g", {}, g); star(sg, 0, 0, 19, YEL);
        return { g, sg };
      });
      const st = el("g", {}, svg);
      el("rect", { x: 216, y: 198, width: 248, height: 166, rx: 16, fill: "#fff", "fill-opacity": 0, stroke: INK, "stroke-width": 2, class: "mg-ring" }, st);
      const mk = (col) => {
        const g = el("g", {}, st);
        el("rect", { x: -9, y: -106, width: 18, height: 38, fill: "#fff", stroke: INK, "stroke-width": 3 }, g);
        el("circle", { cx: 0, cy: -122, r: 22, fill: YEL, stroke: INK, "stroke-width": 3 }, g);
        el("path", { d: "M-36 -16 L-26 -70 H26 L36 -16 Z", fill: col, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, g);
        el("rect", { x: -42, y: -16, width: 84, height: 16, rx: 5, fill: col, stroke: INK, "stroke-width": 3 }, g);
        return g;
      };
      const sa = mk(BLUE), sb = mk(LIL);
      const fc = card(svg, 244, 104, 400, 80, YEL);
      ctx(fc, 36, "redundant emoji rendering", 25); ctx(fc, 64, "nearly 45% of server overhead", 20, { "font-weight": 500 });
      txt(svg, 694, 140, "CPU footprint", { "text-anchor": "middle", "font-size": 20, "font-weight": 700 });
      el("rect", { x: 652, y: 156, width: 84, height: 320, rx: 12, fill: "#fff", stroke: INK, "stroke-width": 3 }, svg);
      el("path", { d: "M640 181 H652 M640 325 H652", stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round" }, svg);
      const fill = el("rect", { x: 659, width: 70, rx: 7, fill: MINT, stroke: INK, "stroke-width": 2.5 }, svg);
      const half = txt(svg, 694, 258, "in half", { "text-anchor": "middle", "font-size": 20, "font-weight": 700 });
      button(st, "Run the stamps again", () => api.seek(0.05));
      const cap = strip(svg, 508, 740);
      return (t, now) => {
        const n = Math.floor(t / CYC), tau = t - n * CYC, mv = cl(bk(seg(tau, 0, 0.5), 0.8), 0, 1.1), press = io(seg(tau, 0.58, 0.74)) * (1 - io(seg(tau, 0.86, 1.06)));
        const back = io(seg(t, 12.3, 12.9)), gone = t >= 5.2;
        cards.forEach((c, s) => {
          let x = 100 + 140 * (s - 1 + mv), sc = 1, op = 1;
          if (s === 0) { x = 100; sc = cl(bk(seg(tau, 0.05, 0.45), 1.6), 0, 1.2); op = sc > 0.02 ? 1 : 0; }
          if (s === 4) { x = 520 + 50 * io(seg(tau, 0, 0.5)); op = 1 - seg(tau, 0.08, 0.42); sc = 1 - 0.12 * seg(tau, 0, 0.5); }
          tf(c.g, x.toFixed(2), CYD, sc.toFixed(3)); c.g.setAttribute("opacity", op.toFixed(2));
          const ss = s === 0 ? 0 : s === 1 ? cl(bk(seg(tau, 0.74, 0.95), 2), 0, 1.3) : s === 2 && !gone ? 1 + 0.14 * Math.sin(Math.PI * seg(tau, 0.88, 1.12)) : 1;
          tf(c.sg, 30, 0, ss.toFixed(3));
        });
        tf(sa, AX, lerp(UP, DN, press).toFixed(2));
        let bx = BX, by = lerp(UP, DN, gone ? 0 : press), br = 0;
        if (gone) {
          const p = seg(t, 5.5, 6.4), e = io(p) * (1 - back);
          bx = lerp(BX, PKX, e); by = lerp(UP, PKY, e) - 44 * Math.sin(Math.PI * p) * (1 - back) + 6 * press * e;
          br = 3 * Math.sin(t * 40) * seg(t, 5.2, 5.3) * (1 - seg(t, 5.42, 5.52)) + 12 * cl(bk(p, 2), 0, 1.4) * (1 - back) + spr(t - 6.4, 5, 4, 11) + Math.sin(now * 1.2) * 0.8 * e;
        }
        tf(sb, bx.toFixed(2), by.toFixed(2), 1, br.toFixed(2));
        fc.setAttribute("transform", `translate(244 ${(104 - 34 * (1 - cl(bk(seg(t, 0.2, 0.7), 1.6), 0, 1.3)) + 7 * Math.abs(spr(t - 4.5, 1, 3.2, 9))).toFixed(2)}) rotate(${spr(t - 4.5, 2.2, 3, 12).toFixed(2)})`);
        fc.setAttribute("opacity", seg(t, 0.2, 0.35).toFixed(2));
        const dk = cl(bk(seg(t, 6.5, 7.3), 1.5), 0, 1.3) * (1 - back), h = lerp(288, 144, dk) + press * (gone ? 4 : 8);
        fill.setAttribute("y", (469 - h).toFixed(2)); fill.setAttribute("height", h.toFixed(2));
        half.setAttribute("opacity", (seg(t, 7.2, 7.6) * (1 - back)).toFixed(2));
        say(cap, t < 1.3 || t >= 12.3 ? "Google's Antigravity post, 13 Oct 2026" : t < 3.3 ? "Somewhere a server was drawing the same emoji twice" : t < 6.5 ? "Redundant emoji rendering: “nearly 45% of server overhead”" : "“cut the CPU footprint of YouTube's comments frontend in half”");
      };
    },
  };

  /* ---- 4. a window, a goal and a rulebook; a pencil works through the night and two notes are ready at sunrise ---- */
  SC.overnight = {
    dur: 13, still: 10.6,
    build(svg, api) {
      head(svg, "What did it do overnight?", "tap the window");
      const WX = 50, WY = 104, WW = 330, WH = 222, MX = 298, LX = 453;
      desk(svg);
      const win = el("g", {}, svg);
      el("rect", { x: 34, y: 94, width: 362, height: 256, rx: 16, fill: "#fff", "fill-opacity": 0, stroke: INK, "stroke-width": 2, class: "mg-ring" }, win);
      const cp = el("clipPath", { id: "mgc-win" }, el("defs", {}, win));
      el("rect", { x: WX, y: WY, width: WW, height: WH }, cp);
      const pane = el("g", { "clip-path": "url(#mgc-win)" }, win);
      el("rect", { x: WX, y: WY, width: WW, height: WH, fill: LIL }, pane);
      const day = el("rect", { x: WX, y: WY, width: WW, height: WH, fill: SKY }, pane);
      const stars = el("g", {}, pane);
      [[98, 150, 12], [170, 204, 8], [128, 250, 7], [248, 138, 7]].forEach(([x, y, r]) => star(stars, x, y, r, "#fff"));
      const cloud = el("g", {}, pane);
      el("path", { d: "M-40 14 a15 15 0 0 1 4 -29 a20 20 0 0 1 38 -6 a16 16 0 0 1 22 35 Z", fill: "#fff", stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, cloud);
      const moon = el("g", {}, pane);
      el("path", { d: "M1.1 -30 A30 30 0 1 0 27.6 11.7 A25 25 0 1 1 1.1 -30 Z", fill: "#fff", stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, moon);
      const sun = el("g", {}, pane), rays = el("g", {}, sun);
      for (let i = 0; i < 8; i++) el("path", { d: "M0 -42 V-54", stroke: INK, "stroke-width": 3, "stroke-linecap": "round", transform: `rotate(${i * 45})` }, rays);
      el("circle", { r: 32, fill: YEL, stroke: INK, "stroke-width": 3 }, sun);
      el("path", { d: `M${WX} ${WY + WH} V298 Q130 262 215 292 T${WX + WW} 280 V${WY + WH} Z`, fill: MINT, stroke: INK, "stroke-width": 2.5 }, pane);
      el("path", { d: `M${WX + WW / 2} ${WY} V${WY + WH}`, stroke: INK, "stroke-width": 3 }, win);
      el("rect", { x: WX, y: WY, width: WW, height: WH, fill: "none", stroke: INK, "stroke-width": 3 }, win);
      el("rect", { x: 40, y: WY + WH, width: 350, height: 14, rx: 5, fill: "#fff", stroke: INK, "stroke-width": 3 }, win);
      el("rect", { x: 50, y: 362, width: 178, height: 112, rx: 8, fill: "#fff", stroke: INK, "stroke-width": 3 }, svg);
      for (let i = 0; i < 7; i++) el("circle", { cx: 68 + i * 23.6, cy: 362, r: 4.5, fill: SOFT, stroke: INK, "stroke-width": 2 }, svg);
      txt(svg, 139, 400, "one-paragraph", { "text-anchor": "middle", "font-size": 20, "font-weight": 700 });
      txt(svg, 139, 424, "goal", { "text-anchor": "middle", "font-size": 20, "font-weight": 700 });
      el("path", { d: "M68 441 H210 M68 452 H210 M68 463 H150", stroke: LIL, "stroke-width": 3, "stroke-linecap": "round" }, svg);
      el("rect", { x: 250, y: 366, width: 132, height: 108, rx: 6, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, svg);
      el("rect", { x: 244, y: 362, width: 132, height: 112, rx: 8, fill: BLUE, stroke: INK, "stroke-width": 3 }, svg);
      el("path", { d: "M260 364 V472", stroke: INK, "stroke-width": 2.5 }, svg);
      el("rect", { x: 268, y: 394, width: 100, height: 40, rx: 8, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, svg);
      fit(txt(svg, 318, 421, "rulebook", { "text-anchor": "middle", "font-size": 20, "font-weight": 700 }), 88);
      const SH = [[585, 180, YEL, [["session prep time", -32, 22, 600], ["cut by 40%", 12, 36, 700], ["in long sessions", 48, 20, 500]]], [585, 346, MINT, [["cold imports", -18, 22, 600], ["sped up by 21%", 30, 36, 700]]]];
      const LY = [-36, -4, 28], LW = [264, 264, 176];
      const sheets = SH.map(([cx, cy, col, lines]) => {
        const g = el("g", {}, svg), a = el("g", {}, g), b = el("g", {}, g);
        el("rect", { x: -165, y: -74, width: 330, height: 148, rx: 10, fill: "#fff", stroke: INK, "stroke-width": 3 }, a);
        el("path", { d: LY.map((y, j) => `M-132 ${y + 9} H${-132 + LW[j]}`).join(" "), stroke: LIL, "stroke-width": 2, "stroke-linecap": "round", "stroke-dasharray": "2 8" }, a);
        const sc = LY.map((y, j) => { let d = `M-132 ${y} q5.5 -7 11 0`; for (let i = 1; i < LW[j] / 11; i++) d += " t11 0"; return el("path", { d, fill: "none", stroke: MUTE, "stroke-width": 3, "stroke-linecap": "round", "stroke-linejoin": "round", pathLength: 1, opacity: 0 }, a); });
        el("rect", { x: -165, y: -74, width: 330, height: 148, rx: 10, fill: col, stroke: INK, "stroke-width": 3 }, b);
        lines.forEach(([s, y, size, w]) => fit(ctx(b, y, s, size, { "font-weight": w }), 290));
        return { g, a, b, sc, cx, cy };
      });
      /* the pencil that does the night shift; it is a good deal shorter by morning */
      const pen = el("g", {}, svg);
      el("path", { d: "M0 0 L-6 16 H6 Z", fill: "#fff", stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, pen);
      el("path", { d: "M0 0 L-2.4 6.4 H2.4 Z", fill: INK }, pen);
      const pb = el("rect", { x: -6, y: 16, width: 12, height: 104, fill: YEL, stroke: INK, "stroke-width": 2.5 }, pen), pe = el("g", {}, pen);
      el("rect", { x: -6, y: 0, width: 12, height: 8, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, pe);
      el("rect", { x: -6, y: 8, width: 12, height: 12, rx: 3, fill: LIL, stroke: INK, "stroke-width": 2.5 }, pe);
      const K = [];
      let tt = 1.3, px = LX, py = 130;
      [0, 1].forEach((s) => LY.forEach((ly, j) => {
        const y = SH[s][1] + ly, d = (LW[j] / 264) * 0.7;
        K.push([tt - (s || j ? 0.18 : 0.3), tt, px, py, LX, y, 0, s, j]);
        K.push([tt, tt + d, LX, y, LX + LW[j], y, 1, s, j]);
        px = LX + LW[j]; py = y; tt += d + 0.18 + (j === 2 ? 0.3 : 0);
      }));
      const tip = (t) => {
        let x = LX, y = 130, w = 0;
        for (const k of K) { if (t < k[0]) break; const p = seg(t, k[0], k[1]), e = k[6] ? p : io(p); x = lerp(k[2], k[4], e); y = lerp(k[3], k[5], e) - (k[6] ? 0 : 12 * Math.sin(Math.PI * p)); w = k[6] && p < 1 ? 1 : 0; }
        return [x, y, w];
      };
      button(win, "Run the night again", () => api.seek(0.9));
      const cap = strip(svg, 508, 740);
      return (t, now) => {
        const back = io(seg(t, 12.3, 12.9)), dawn = io(seg(t, 5.6, 7.4)) * (1 - back);
        day.setAttribute("opacity", dawn.toFixed(3));
        stars.setAttribute("opacity", (Math.max(1 - seg(t, 4.8, 6.2), back) * (0.82 + 0.18 * Math.sin(now * 2.1))).toFixed(2));
        cloud.setAttribute("opacity", (seg(t, 7.0, 7.8) * (1 - back)).toFixed(2));
        tf(cloud, (128 + Math.sin(now * 0.5) * 8).toFixed(2), 168);
        tf(moon, MX, lerp(176, 372, io(seg(t, 1.0, 6.2)) * (1 - back)).toFixed(2), 1, -18);
        tf(sun, MX, lerp(372, 182, cl(bk(seg(t, 6.0, 7.5), 1.1), 0, 1.2) * (1 - back)).toFixed(2));
        rays.setAttribute("transform", `rotate(${(now * 8).toFixed(2)})`);
        K.forEach((k) => { if (!k[6]) return; const p = t >= 12.3 ? 0 : seg(t, k[0], k[1]), n = sheets[k[7]].sc[k[8]]; n.setAttribute("stroke-dasharray", `${p.toFixed(4)} 2`); n.setAttribute("opacity", p > 0.004 ? 1 : 0); });
        sheets.forEach((sh, s) => {
          const a = 7.6 + s * 0.6, e = io(seg(t, a, a + 0.6)) * (1 - back), front = e < 0.5;
          const sy = Math.max(0.03, Math.abs(Math.cos(Math.PI * e))) * (1 + spr(t - a - 0.6, 0.06, 5, 15));
          sh.a.setAttribute("opacity", front ? 1 : 0); sh.b.setAttribute("opacity", front ? 0 : 1);
          sh.g.setAttribute("transform", `translate(${sh.cx} ${sh.cy}) scale(1 ${sy.toFixed(4)})`);
        });
        const [tx, ty, w] = tip(t), rest = seg(t, 6.4, 7.1), re = io(rest);
        const L = lerp(lerp(104, 44, seg(t, 1.3, 6.23)), 104, back);
        const x = lerp(lerp(tx, 500, re), LX, back), y = lerp(lerp(ty, 471, re) - 46 * Math.sin(Math.PI * rest) - Math.abs(spr(t - 7.1, 5, 6, 16)) + (t < 1 ? Math.sin(now * 2.4) * 2 : 0), 130, back);
        const rot = lerp(lerp(-15 + (w ? 3 * Math.sin(t * 38) : 0), -90, re), -15, back);
        pb.setAttribute("height", L.toFixed(2)); tf(pe, 0, (16 + L).toFixed(2));
        tf(pen, x.toFixed(2), y.toFixed(2), 1, rot.toFixed(2));
        say(cap, t < 1.3 || t >= 12.3 ? "Google's launch post, 13 Oct 2026" : t < 6.3 ? "“their .agents/skills rulebook and a one-paragraph goal”" : t < 7.6 ? "“Working autonomously overnight”" : "“now live in google/adk-python”. Google's own figures.");
      };
    },
  };

  /* ---- title card, 16 by 9 ---- */
  SC.hero = {
    w: 960, h: 540, dur: 1, still: 0,
    build(svg) {
      txt(svg, 64, 106, "Google's own numbers, on its own code", { "font-size": 25, "font-weight": 500, fill: MUTE });
      const ti = fit(txt(svg, 60, 184, "Gemini 4 Argon Inside Google", { "font-size": 66, "font-weight": 700 }), 840);
      el("path", { d: `M66 214 H${Math.round(54 + ti.getComputedTextLength())}`, stroke: YEL, "stroke-width": 12, "stroke-linecap": "round" }, svg);
      el("rect", { x: 60, y: 250, width: 312, height: 56, rx: 28, fill: SOFT, stroke: INK, "stroke-width": 3 }, svg);
      txt(svg, 216, 287, "Checked 13 Oct 2026", { "text-anchor": "middle", "font-size": 25, "font-weight": 700 });
      el("path", { d: "M74 392 C170 346 262 424 360 380 S470 366 520 388", stroke: LIL, "stroke-width": 5, fill: "none", "stroke-linecap": "round", "stroke-dasharray": "1 16" }, svg);
      el("circle", { cx: 74, cy: 392, r: 11, fill: MINT, stroke: INK, "stroke-width": 3 }, svg);
      star(svg, 452, 322, 12, SKY); star(svg, 876, 296, 16, MINT); star(svg, 556, 274, 11, YEL);
      const wave = (y, col) => el("path", { fill: "none", stroke: col, "stroke-width": 5, "stroke-linecap": "round", "stroke-linejoin": "round" }, svg);
      const shape = (n, y, ph) => { let d = ""; for (let x = 60; x <= 900; x += 12) d += `${x === 60 ? "M" : "L"}${x} ${(y + 7 * Math.sin((x + ph) / 26)).toFixed(1)} `; n.setAttribute("d", d); };
      const w0 = wave(426, SKY);
      const boat = el("g", {}, svg);
      el("path", { d: "M-70 2 L0 -130 L70 2 Z", fill: "#fff", stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, boat);
      el("path", { d: "M0 -130 L70 2 H0 Z", fill: SOFT, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, boat);
      el("path", { d: "M-160 -12 L-78 78 H78 L160 -12 L0 15 Z", fill: YEL, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, boat);
      el("path", { d: "M0 15 V78", stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round" }, boat);
      const w1 = wave(448, BLUE), w2 = wave(478, SKY);
      return (t, now) => {
        shape(w0, 426, now * 26); shape(w1, 448, 40 - now * 34); shape(w2, 478, 90 + now * 22);
        tf(boat, 696, (376 + Math.sin(now * 1.6) * 5).toFixed(2), 1, (Math.sin(now * 1.3 + 0.6) * 3.5).toFixed(2));
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
