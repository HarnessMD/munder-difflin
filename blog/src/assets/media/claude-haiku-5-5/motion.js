/* Bright coded scenes for "Claude Haiku 5.5". Vanilla JS, no library.
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

  const GREY = "#B69CFF";
  const pillFit = (g, t, pad) => { const r = g.querySelector("rect"), w = t.getComputedTextLength() + pad; r.setAttribute("x", -w / 2); r.setAttribute("width", w); return w; };

  const SC = {};

  /* ---- 1. one stopwatch runs and stops; two paper labels carry the claim and its footnote ---- */
  SC.stopwatch = {
    dur: 11, still: 8.6,
    build(svg, api) {
      txt(svg, 44, 62, "Anthropic's speed claim", { "font-size": 32, "font-weight": 700 });
      txt(svg, 44, 98, "Announcement of 7 October 2026", { "font-size": 20, "font-weight": 500, fill: MUTE });
      txt(svg, 756, 60, "tap the stopwatch", { "text-anchor": "end", "font-size": 20, fill: MUTE, "font-weight": 500 });
      const CX = 236, CY = 318, R = 138;
      const w = el("g", {}, svg);
      const crown = el("g", {}, w);
      el("rect", { x: -20, y: -R - 44, width: 40, height: 30, rx: 8, fill: SOFT, stroke: INK, "stroke-width": 3 }, crown);
      el("rect", { x: -11, y: -R - 18, width: 22, height: 20, fill: "#fff", stroke: INK, "stroke-width": 3 }, w);
      el("rect", { x: -13, y: -R - 30, width: 26, height: 22, rx: 6, fill: LIL, stroke: INK, "stroke-width": 3, transform: "rotate(42)" }, w);
      el("circle", { r: R, fill: YEL, stroke: INK, "stroke-width": 3 }, w);
      el("circle", { r: R - 22, fill: "#fff", stroke: INK, "stroke-width": 3 }, w);
      for (let i = 0; i < 60; i++) { const big = i % 5 === 0; el("path", { d: `M0 ${-(R - 30)} V${-(R - (big ? 42 : 37))}`, stroke: big ? INK : GREY, "stroke-width": big ? 3 : 2, "stroke-linecap": "round", transform: `rotate(${i * 6})` }, w); }
      const arc = el("circle", { r: R - 54, fill: "none", stroke: SKY, "stroke-width": 10, "stroke-linecap": "round", pathLength: 360, transform: "rotate(-90)" }, w);
      txt(w, 0, 50, "Haiku 5.5", { "text-anchor": "middle", "font-size": 24, "font-weight": 700 });
      const hand = el("g", {}, w);
      el("path", { d: `M0 22 V${-(R - 44)}`, stroke: INK, "stroke-width": 5, "stroke-linecap": "round" }, hand);
      el("circle", { r: 10, fill: BLUE, stroke: INK, "stroke-width": 3 }, w);
      el("circle", { r: R + 10, fill: "#fff", "fill-opacity": 0, stroke: INK, "stroke-width": 2, "stroke-dasharray": "3 7", class: "mg-ring" }, w);
      button(w, "Stopwatch for Haiku 5.5. Press to run it again.", () => api.seek(0.2));
      const label = (y, fill, a, b, rot) => {
        const g = el("g", {}, svg);
        el("rect", { x: 0, y: -52, width: 300, height: 104, rx: 16, fill, stroke: INK, "stroke-width": 3 }, g);
        el("circle", { cx: 26, cy: 0, r: 8, fill: "#fff", stroke: INK, "stroke-width": 3 }, g);
        txt(g, 52, -8, a, { "font-size": 24, "font-weight": 700 });
        txt(g, 52, 24, b, { "font-size": 24, "font-weight": 500 });
        return { g, y, rot };
      };
      const A = label(252, YEL, "fastest to date", "at standard speed", -2.5), B = label(384, LIL, "Opus in Fast Mode", "is quicker", 2);
      const cap = strip(svg, 506, 640);
      return (t) => {
        const run = oc(seg(t, 0.8, 3.6)), deg = 312 * run, out = 1 - seg(t, 10.4, 10.9);
        hand.setAttribute("transform", `rotate(${deg * out})`);
        arc.setAttribute("stroke-dasharray", `${Math.max(0.01, deg * out)} 400`); arc.setAttribute("opacity", deg * out < 2 ? 0 : 1);
        const press = Math.sin(seg(t, 0.55, 0.85) * Math.PI) + Math.sin(seg(t, 3.55, 3.85) * Math.PI);
        crown.setAttribute("transform", `translate(0 ${8 * press})`);
        const jolt = Math.sin(seg(t, 3.6, 4.0) * Math.PI) * 0.03;
        tf(w, CX, CY, 1 + jolt);
        [[A, 4.2], [B, 5.4]].forEach(([l, s]) => { const k = ob(seg(t, s, s + 0.6)) * out; tf(l.g, 820 - 384 * k, l.y, 1, l.rot * k); l.g.setAttribute("opacity", k <= 0 ? 0 : 1); });
        cap.textContent = t < 5.4 || t > 10.4 ? "Anthropic calls Haiku 5.5 its fastest at standard speed" : "Anthropic's claim. We have not tried it.";
      };
    },
  };

  /* ---- 2. a small measuring cup fills, spills over its lip and carries on into a larger one ---- */
  SC.cups = {
    dur: 12.5, still: 9.6,
    build(svg) {
      txt(svg, 44, 62, "One model, two price tiers", { "font-size": 32, "font-weight": 700 });
      txt(svg, 44, 98, "Anthropic's prices for Haiku 5.5, per 1 million tokens", { "font-size": 20, "font-weight": 500, fill: MUTE });
      const G = 404;
      const s1 = el("path", { stroke: SKY, "stroke-width": 12, fill: "none", "stroke-linecap": "round" }, svg);
      const s2 = el("path", { stroke: SKY, "stroke-width": 12, fill: "none", "stroke-linecap": "round" }, svg);
      /* tap */
      el("path", { d: "M50 150 H186 Q210 150 210 172 V184", stroke: INK, "stroke-width": 28, fill: "none", "stroke-linejoin": "round" }, svg);
      el("path", { d: "M50 150 H186 Q210 150 210 172 V184", stroke: SOFT, "stroke-width": 22, fill: "none", "stroke-linejoin": "round" }, svg);
      el("rect", { x: 44, y: 126, width: 14, height: 48, rx: 5, fill: LIL, stroke: INK, "stroke-width": 3 }, svg);
      el("path", { d: "M128 136 V124", stroke: INK, "stroke-width": 3 }, svg);
      const wh = el("rect", { x: 104, y: 112, width: 48, height: 13, rx: 6.5, fill: YEL, stroke: INK, "stroke-width": 3 }, svg);
      const cup = (x, top, b, w, lip) => {
        const r = 16, hw = lip ? 30 : 46, hh = lip ? 24 : 36;
        const liq = el("path", { fill: SKY }, svg);
        const n = lip ? 3 : 5;
        for (let i = 1; i <= n; i++) el("path", { d: `M${x + 3} ${b - (i * (b - top)) / (n + 1)} h${i % 2 ? 18 : 28}`, stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round" }, svg);
        el("path", { d: `M${x + w} ${top + 26} q${hw} 0 ${hw} ${hh} q0 ${hh} -${hw} ${hh}`, stroke: INK, "stroke-width": 3, fill: "none", "stroke-linecap": "round", transform: lip ? `translate(${2 * x + w} 0) scale(-1 1)` : "" }, svg);
        el("path", { d: `M${x} ${top} V${b - r} Q${x} ${b} ${x + r} ${b} H${x + w - r} Q${x + w} ${b} ${x + w} ${b - r} V${top}` + (lip ? ` l14 -8` : ""), stroke: INK, "stroke-width": 3, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, svg);
        return (lv) => { const y = b - (b - top) * lv; liq.setAttribute("d", lv <= 0.01 ? "" : `M${x + 1.5} ${y} H${x + w - 1.5} V${b - r} Q${x + w - 1.5} ${b - 1.5} ${x + w - r} ${b - 1.5} H${x + r} Q${x + 1.5} ${b - 1.5} ${x + 1.5} ${b - r} Z`); return y; };
      };
      el("rect", { x: 122, y: 292, width: 176, height: G - 292, rx: 12, fill: SOFT, stroke: INK, "stroke-width": 3 }, svg);
      const small = cup(146, 200, 292, 128, true), big = cup(420, 262, G, 270, false);
      el("path", { d: `M44 ${G} H756`, stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, svg);
      const card = (cx, fill, head, a, b) => {
        const g = el("g", {}, svg);
        el("rect", { x: -150, y: 0, width: 300, height: 128, rx: 16, fill: "#fff", stroke: INK, "stroke-width": 3 }, g);
        el("path", { d: "M-150 42 H150 V16 Q150 0 134 0 H-134 Q-150 0 -150 16 Z", fill, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, g);
        txt(g, 0, 29, head, { "text-anchor": "middle", "font-size": 20, "font-weight": 700 });
        [["input", a, 76], ["output", b, 110]].forEach(([k, v, y]) => { txt(g, -126, y, k, { "font-size": 22, "font-weight": 500 }); txt(g, 126, y, v, { "text-anchor": "end", "font-family": MONO, "font-size": 26, "font-weight": 700 }); });
        return { g, cx };
      };
      const c1 = card(210, YEL, "prompts up to 100k tokens", "$0.10", "$0.50"), c2 = card(570, LIL, "prompts over 100k tokens", "$0.50", "$2.50");
      return (t) => {
        const out = 1 - seg(t, 11.6, 12.3);
        const on = seg(t, 0.5, 0.8) * (1 - seg(t, 8.2, 8.5));
        const f1 = seg(t, 0.8, 3.4), f2 = seg(t, 4.0, 8.4);
        const y1 = small(0.93 * f1 * out), y2 = big(0.72 * f2 * out);
        wh.setAttribute("transform", `rotate(${-9 * (seg(t, 0.3, 0.6) - seg(t, 8.0, 8.3))} 128 118)`);
        const wob = Math.sin(t * 20) * 1.2;
        s1.setAttribute("d", `M210 188 V${y1 + 4}`); s1.setAttribute("opacity", on); s1.setAttribute("stroke-width", 12 + wob);
        const over = seg(t, 3.5, 3.9) * (1 - seg(t, 8.5, 8.8));
        s2.setAttribute("d", `M284 198 Q${284 + 204 * over} 184 ${284 + 216 * over} ${198 + (y2 - 194) * over}`); s2.setAttribute("opacity", over <= 0 ? 0 : 1); s2.setAttribute("stroke-width", 12 - wob);
        [[c1, 3.4], [c2, 5.2]].forEach(([c, s]) => { const k = ob(seg(t, s, s + 0.5)) * out; tf(c.g, c.cx, 432 + 20 * (1 - k), 0.7 + 0.3 * k); c.g.setAttribute("opacity", cl(k * 3)); });
      };
    },
  };

  /* ---- 3. four paper planes, one benchmark at a time; each lands as far as its score ---- */
  SC.planes = {
    dur: 14, still: 4.8,
    build(svg, api) {
      const M = [["Haiku 5.5", YEL], ["Haiku 4.5", SKY], ["GPT-6 Luna", LIL], ["Sonnet 5.5", BLUE]];
      const B = [
        ["GDPval-AA v2.1", ["1620", "735", "1437", "1840"], 2000, ""],
        ["OSWorld 2.1, offline subset", ["72.4%", "15.7%", "48.9%", "83.9%"], 100, ""],
        ["Humanity's Last Exam, no tools", ["45.9%", "10.2%", null, "56.9%"], 100, ""],
        ["Terminal-Bench 4.0", ["39.2%", "0.0%", "16.4%", "70.6%"], 100, ""],
        ["FrontierCode 1.1 (Main)", ["46.4%", null, "42.4%", "52.1%"], 100, "Xhigh effort"],
      ];
      const N = B.length, P = 2.8, X0 = 236, LEN = 400, Y = [164, 232, 300, 368];
      const at = (b, i) => { const v = B[b][1][i]; return v == null ? { x: X0, nr: 1 } : { x: X0 + (parseFloat(v) / B[b][2]) * LEN, nr: 0 }; };
      txt(svg, 44, 62, "Anthropic's own figures", { "font-size": 32, "font-weight": 700 });
      txt(svg, 44, 98, "Five rows we selected. We did not run them. NR means not reported.", { "font-size": 20, "font-weight": 500, fill: MUTE });
      el("path", { d: `M${X0 - 40} 132 V412`, stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, svg);
      el("rect", { x: X0 - 40, y: 412, width: LEN + 64, height: 26, rx: 8, fill: SOFT, stroke: INK, "stroke-width": 3 }, svg);
      for (let i = 1; i < 20; i++) el("path", { d: `M${X0 + (i * LEN) / 20} 412 v${i % 2 ? 9 : 15}`, stroke: INK, "stroke-width": 2.5 }, svg);
      const pl = M.map(([name, col], i) => {
        txt(svg, 44, Y[i] + 8, name, { "font-size": 22, "font-weight": 700 });
        const trail = el("path", { stroke: GREY, "stroke-width": 3, fill: "none", "stroke-linecap": "round", "stroke-dasharray": "2 9" }, svg);
        const g = el("g", {}, svg);
        const body = el("path", { d: "M-34 -15 L30 0 L-34 15 L-22 0 Z", fill: col, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, g);
        el("path", { d: "M-22 0 H30", stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round" }, g);
        const v = txt(svg, 0, Y[i] + 9, "", { "font-size": 24, "font-weight": 700 });
        const note = txt(svg, 0, Y[i] + 8, "", { "font-size": 20, "font-weight": 500, fill: MUTE });
        return { trail, g, body, v, note, col };
      });
      el("rect", { x: 172, y: 478, width: 456, height: 52, rx: 26, fill: SOFT }, svg);
      const name = txt(svg, 400, 512, "", { "text-anchor": "middle", "font-size": 22, "font-weight": 700 });
      let user = null, shown = 0;
      const step = (d) => { user = { from: shown, to: (shown + d + N) % N, t0: api.now() }; api.poke(); };
      [[-1, 130, "Previous benchmark", "M5 -9 L-5 0 L5 9"], [1, 670, "Next benchmark", "M-5 -9 L5 0 L-5 9"]].forEach(([d, x, label, arrow]) => {
        const g = el("g", { transform: `translate(${x} 504)` }, svg);
        el("circle", { r: 32, fill: "none", stroke: INK, "stroke-width": 2, "stroke-dasharray": "3 7", class: "mg-ring" }, g);
        el("circle", { r: 26, fill: "#fff", stroke: INK, "stroke-width": 3 }, g);
        el("path", { d: arrow, stroke: INK, "stroke-width": 3.5, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, g);
        button(g, label, () => step(d));
        g.addEventListener("keydown", (e) => { const s = e.key === "ArrowRight" || e.key === "ArrowUp" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowDown" ? -1 : 0; if (s) { e.preventDefault(); step(s); } });
      });
      return (t, now) => {
        let idx, prev, u;
        if (user) { idx = user.to; prev = user.from; u = cl((now - user.t0) / P); }
        else { idx = Math.floor(t / P) % N; prev = (idx + N - 1) % N; u = (t % P) / P; }
        shown = idx; name.textContent = B[idx][0];
        pl.forEach((p, i) => {
          const a = at(prev, i), c = at(idx, i), k = io(seg(u, 0.02 + i * 0.03, 0.36 + i * 0.03)), x = a.x + (c.x - a.x) * k, lift = Math.sin(k * Math.PI);
          tf(p.g, x, Y[i] - 16 * lift, 1, -9 * lift * Math.sign(c.x - a.x || 1) * Math.cos(k * Math.PI));
          p.trail.setAttribute("d", x - X0 < 34 ? "" : `M${X0 - 24} ${Y[i]} H${x - 46}`);
          const s = B[idx][1][i], show = seg(u, 0.4 + i * 0.03, 0.5 + i * 0.03);
          p.v.textContent = s == null ? "NR" : s; p.v.setAttribute("x", c.x + 44); p.v.setAttribute("opacity", show);
          const nt = i === 3 ? B[idx][3] : ""; p.note.textContent = nt; if (nt) { p.note.setAttribute("x", c.x + 44 + p.v.getComputedTextLength() + 12); p.note.setAttribute("opacity", show); }
          p.body.setAttribute("fill", c.nr && k > 0.5 ? "#fff" : p.col); p.body.setAttribute("stroke-dasharray", c.nr && k > 0.5 ? "6 6" : "none");
        });
      };
    },
  };

  /* ---- 4. a postcard rack turns; the card at the front flips to show what the alias gives there ---- */
  SC.postcards = {
    dur: 14.6, still: 12.6,
    build(svg, api) {
      const C = [[["Claude Platform", "on AWS"], "Haiku 4.5", SKY, "Claude Platform on AWS"], [["Amazon", "Bedrock"], "Haiku 4.5", LIL, "Amazon Bedrock"], [["Google Cloud's", "Agent Platform"], "Haiku 4.5", YEL, "Google Cloud's Agent Platform"], [["Microsoft", "Foundry"], "Haiku 4.5", BLUE, "Microsoft Foundry"], [["Anthropic", "API"], "Haiku 5.5", MINT, "the Anthropic API"]];
      const N = C.length, P = 2.6, R = 262, CY = 296, W = 230, H = 276;
      txt(svg, 44, 62, "Where the haiku alias points", { "font-size": 32, "font-weight": 700 });
      txt(svg, 44, 98, "Claude Code model docs, read 8 Oct 2026", { "font-size": 20, "font-weight": 500, fill: MUTE });
      txt(svg, 756, 60, "tap to turn", { "text-anchor": "end", "font-size": 20, fill: MUTE, "font-weight": 500 });
      el("ellipse", { cx: 400, cy: CY, rx: R, ry: 22, fill: "none", stroke: GREY, "stroke-width": 3, "stroke-dasharray": "2 9", "stroke-linecap": "round" }, svg);
      const layer = el("g", {}, svg);
      el("rect", { x: 34, y: 116, width: 732, height: 374, rx: 26, fill: "#fff", "fill-opacity": 0, stroke: INK, "stroke-width": 2, "stroke-dasharray": "3 7", class: "mg-ring" }, layer);
      const pole = el("g", {}, layer);
      el("rect", { x: 330, y: 462, width: 140, height: 20, rx: 10, fill: SOFT, stroke: INK, "stroke-width": 3 }, pole);
      el("path", { d: "M400 128 V462", stroke: INK, "stroke-width": 6, "stroke-linecap": "round" }, pole);
      el("circle", { cx: 400, cy: 124, r: 11, fill: YEL, stroke: INK, "stroke-width": 3 }, pole);
      const cards = C.map(([nm, model, col]) => {
        const g = el("g", {}, layer), flip = el("g", {}, g);
        const front = el("g", {}, flip), back = el("g", {}, flip);
        el("rect", { x: -W / 2, y: -H / 2, width: W, height: H, rx: 18, fill: "#fff", stroke: INK, "stroke-width": 3 }, front);
        const ft = el("g", {}, front);
        el("rect", { x: W / 2 - 62, y: -H / 2 + 18, width: 44, height: 52, rx: 6, fill: col, stroke: INK, "stroke-width": 3 }, ft);
        nm.forEach((s, i) => txt(ft, 0, -8 + i * 34, s, { "text-anchor": "middle", "font-size": 26, "font-weight": 700 }));
        el("path", { d: `M${-W / 2 + 28} 74 H${W / 2 - 28} M${-W / 2 + 28} 98 H${W / 2 - 70}`, stroke: SOFT, "stroke-width": 6, "stroke-linecap": "round" }, ft);
        el("rect", { x: -W / 2, y: -H / 2, width: W, height: H, rx: 18, fill: model === "Haiku 5.5" ? MINT : SOFT, stroke: INK, "stroke-width": 3 }, back);
        const bt = el("g", {}, back);
        const pg = el("g", { transform: "translate(0 -92)" }, bt);
        el("rect", { x: -52, y: -22, width: 104, height: 44, rx: 12, fill: "#fff", stroke: INK, "stroke-width": 3 }, pg);
        txt(pg, 0, 8, "haiku", { "text-anchor": "middle", "font-family": MONO, "font-size": 24, "font-weight": 700 });
        txt(bt, 0, -34, "resolves to", { "text-anchor": "middle", "font-size": 24, "font-weight": 500 });
        txt(bt, 0, 14, model, { "text-anchor": "middle", "font-size": 40, "font-weight": 700 });
        el("path", { d: `M${-W / 2 + 28} 40 H${W / 2 - 28}`, stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round", "stroke-dasharray": "2 8" }, bt);
        nm.forEach((s, i) => txt(bt, 0, 78 + i * 30, s, { "text-anchor": "middle", "font-size": 24, "font-weight": 600 }));
        return { g, flip, front, back, ft, bt };
      });
      const cap = strip(svg, 506, 700);
      let last = 0, key = "";
      button(layer, "Postcard rack. Press to turn to the next provider.", () => { const k = Math.min(N - 1, Math.floor(last / P)); api.seek(((k + 1) % N) * P + 0.02); });
      return (t) => {
        last = t;
        const k = Math.min(N - 1, Math.floor(t / P)), u = t - k * P, pos = k - 1 + io(seg(u, 0, 0.9)), back = seg(t, N * P + 0.9, N * P + 1.4);
        const order = [[0, pole]];
        cards.forEach((c, i) => {
          const a = ((i - pos) * 2 * Math.PI) / N, z = Math.cos(a), s = 0.64 + 0.36 * (z + 1) / 2;
          tf(c.g, 400 + R * Math.sin(a), CY + 16 * z, s);
          const f = (i < k ? 1 : i === k ? io(seg(u, 1.05, 1.6)) : 0) * (1 - io(back)), sx = Math.abs(Math.cos(f * Math.PI));
          c.flip.setAttribute("transform", `scale(${Math.max(0.02, sx)} 1)`);
          c.front.setAttribute("display", f > 0.5 ? "none" : ""); c.back.setAttribute("display", f > 0.5 ? "" : "none");
          const vis = seg(z, -0.05, 0.28); c.ft.setAttribute("opacity", vis); c.bt.setAttribute("opacity", vis);
          order.push([z, c.g]);
        });
        order.sort((p, q) => p[0] - q[0]);
        const nk = order.map((o) => (o[1] === pole ? "p" : cards.findIndex((c) => c.g === o[1]))).join("");
        if (nk !== key) { key = nk; order.forEach((o) => layer.appendChild(o[1])); }
        cap.textContent = u < 1.35 || back > 0 ? "In Claude Code, the haiku alias depends on your provider" : `On ${C[k][3]}, haiku resolves to ${C[k][1]}`;
      };
    },
  };

  /* ---- title card, 16 by 9: a row of dominoes part way through falling ---- */
  SC.hero = {
    w: 960, h: 540, dur: 9, still: 2.7,
    build(svg) {
      const kg = el("g", { transform: "translate(64 62)" }, svg);
      const kr = el("rect", { x: 0, y: 0, height: 40, rx: 20, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, kg);
      const kt = txt(kg, 20, 28, "Concepts", { "font-size": 22, "font-weight": 700 });
      kr.setAttribute("width", kt.getComputedTextLength() + 40);
      const title = txt(svg, 62, 206, "Claude Haiku 5.5", { "font-size": 96, "font-weight": 700 });
      el("path", { d: `M66 236 H${62 + title.getComputedTextLength() - 6}`, stroke: YEL, "stroke-width": 14, "stroke-linecap": "round" }, svg);
      txt(svg, 64, 292, "Checked 8 Oct 2026", { "font-size": 26, "font-weight": 500, fill: MUTE });
      const G = 478, DW = 20, DH = 96, D = 52, n = 15, TH = (Math.acos(DW / D) * 180) / Math.PI;
      el("path", { d: `M64 ${G} H896`, stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, svg);
      const COL = [YEL, SKY, LIL, MINT, BLUE];
      const ds = Array.from({ length: n }, (_, i) => {
        const g = el("g", {}, svg);
        el("rect", { x: -DW, y: -DH, width: DW, height: DH, rx: 5, fill: COL[i % 5], stroke: INK, "stroke-width": 3 }, g);
        return g;
      });
      const RAD = Math.PI / 180;
      const fits = (a, b) => {
        const px = DH * Math.sin(a), py = DH * Math.cos(a), bx = D - DW * Math.cos(b), by = DW * Math.sin(b);
        const along = (px - bx) * Math.sin(b) + (py - by) * Math.cos(b), side = (px - bx) * Math.cos(b) - (py - by) * Math.sin(b);
        if (along <= DH) return side <= 0.3;
        return (bx + DH * Math.sin(b)) * Math.cos(a) - (by + DH * Math.cos(b)) * Math.sin(a) >= -0.3;
      };
      return (t) => {
        const up = 1 - io(seg(t, 7.6, 8.6));
        let next = null;
        for (let i = n - 1; i >= 0; i--) {
          const k = seg(t, 0.6 + i * 0.24, 1.3 + i * 0.24);
          let a = 90 * k * k * RAD;
          if (next != null && !fits(a, next)) { let lo = 0, hi = a; for (let j = 0; j < 22; j++) { const m = (lo + hi) / 2; if (fits(m, next)) lo = m; else hi = m; } a = lo; }
          next = a;
          ds[i].setAttribute("transform", `translate(${104 + i * D} ${G}) rotate(${(a / RAD) * up})`);
        }
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
