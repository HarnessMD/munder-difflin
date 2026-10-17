/* Bright coded scenes for "How to Use Gemini 4 Argon". Vanilla JS, no library.
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
  const sm = (x) => x * x * (3 - 2 * x);
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
  /* a folded paper plane, nose to the right */
  const plane = (p, fill) => {
    const g = el("g", {}, p);
    el("path", { d: "M36 0 L-32 -18 L-20 0 Z", fill: "#fff", stroke: INK, "stroke-width": 2.3, "stroke-linejoin": "round" }, g);
    el("path", { d: "M36 0 L-20 0 L-27 15 Z", fill, stroke: INK, "stroke-width": 2.3, "stroke-linejoin": "round" }, g);
    return g;
  };

  const SC = {};

  /* ---- 1. a standing paper menu; five lines write themselves in, a tag slides in beside each, and the last line gets taped over ---- */
  SC.menu = {
    dur: 13, still: 10.6,
    build(svg, api) {
      head(svg, "What do you need before you start?", "tap a line");
      const MX = 92, MW = 616, MY = 92, MB = 530, RX = MX + 42, TX = MX + MW - 38;
      const R = [
        ["Gemini app", "Ultra or Pro", "Gemini app: Google AI Ultra or Pro subscription"],
        ["AI Mode in Search", "Ultra or Pro", "AI Mode in Search: Google AI Ultra or Pro subscription"],
        ["Google AI Studio", "Paid tier or Ultra", "Google AI Studio: Paid tier of the Gemini API, or Google AI Ultra"],
        ["Gemini API", "Paid tier", "Gemini API: Paid tier"],
        ["Antigravity", "Ultra", "Antigravity: Google AI Ultra subscription"],
        ["Free tier", "not available", "Free tier: not available"],
      ];
      const A = [0.3, 1.35, 2.4, 3.45, 4.5, 6.3], CY = (i) => (i < 5 ? 210 + i * 51 : 480);
      el("rect", { x: 30, y: 548, width: 740, height: 22, rx: 8, fill: SOFT, stroke: INK, "stroke-width": 3 }, svg);
      el("rect", { x: MX + 12, y: MY + 12, width: MW, height: MB - MY, rx: 14, fill: SOFT }, svg);
      el("rect", { x: MX, y: MY, width: MW, height: MB - MY, rx: 14, fill: "#fff", stroke: INK, "stroke-width": 3 }, svg);
      el("rect", { x: MX + 12, y: MY + 12, width: MW - 24, height: MB - MY - 24, rx: 8, fill: "none", stroke: LIL, "stroke-width": 2 }, svg);
      const ti = txt(svg, 400, MY + 58, "Gemini 4 Argon", { "text-anchor": "middle", "font-size": 36, "font-weight": 700 }), hw = ti.getComputedTextLength() / 2;
      star(svg, 400 - hw - 36, MY + 46, 15, YEL); star(svg, 400 + hw + 36, MY + 46, 15, MINT);
      el("path", { d: `M${RX} ${MY + 84} H${TX} M${RX} 447 H${TX}`, stroke: INK, "stroke-width": 2, "stroke-linecap": "round" }, svg);
      const defs = el("defs", {}, svg);
      let pinned = -1;
      const rows = R.map(([name, need, line], i) => {
        const cy = CY(i), free = i === 5, hit = el("g", {}, svg);
        el("rect", { x: MX + 22, y: cy - 24, width: MW - 44, height: 48, rx: 12, fill: "#fff", "fill-opacity": 0, stroke: INK, "stroke-width": 2, class: "mg-ring" }, hit);
        const lead = el("path", { stroke: LIL, "stroke-width": 3, "stroke-linecap": "round", "stroke-dasharray": "1 10", fill: "none" }, hit);
        const mark = el("path", { stroke: YEL, "stroke-width": 9, "stroke-linecap": "round", fill: "none" }, hit);
        const cr = el("rect", { x: RX - 4, y: cy - 24, width: 0, height: 48 }, el("clipPath", { id: "mgc-menu" + i }, defs));
        const nm = txt(el("g", { "clip-path": `url(#mgc-menu${i})` }, hit), RX, cy + 9, name, { "font-size": 25, "font-weight": 700 });
        const tg = el("g", {}, hit), tt = txt(tg, 0, 7, need, { "text-anchor": "middle", "font-size": 20, "font-weight": 700 });
        const tw = Math.round(tt.getComputedTextLength()) + (free ? 46 : 32), h = tw / 2;
        /* the free line gets a strip of tape where the others get a tag */
        if (free) el("path", { d: `M${-h} -19 H${h} l-5 6.33 l5 6.33 l-5 6.34 l5 6.33 l-5 6.33 l5 6.34 H${-h} l5 -6.34 l-5 -6.33 l5 -6.33 l-5 -6.34 l5 -6.33 Z`, fill: SKY, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, tg);
        else el("rect", { x: -h, y: -19, width: tw, height: 38, rx: 10, fill: YEL, stroke: INK, "stroke-width": 2.5 }, tg);
        tg.appendChild(tt);
        const r = { cy, free, lead, mark, cr, tg, tw, len: nm.getComputedTextLength(), t0: -99, off: -99 };
        button(hit, line, () => { const n = api.now(); if (pinned >= 0 && pinned !== i) rows[pinned].off = n; pinned = i; r.t0 = n; api.poke(); });
        return r;
      });
      /* the holder the menu stands in */
      el("path", { d: "M306 548 L322 518 H478 L494 548 Z", fill: LIL, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, svg);
      return (t, now) => {
        const out = io(seg(t, 12.2, 12.8)), o1 = seg(t, 12.2, 12.5), o2 = io(seg(t, 12.5, 12.9));
        rows.forEach((r, i) => {
          const a = A[i], w = io(seg(t, a, a + 0.6)) * (1 - out), k = seg(t, a + 0.5, a + 1.1), kb = bk(k, 1.6), show = seg(k, 0, 0.25) * (1 - o1);
          const tap = now - r.t0, hop = tap >= 0 && tap < 1.4 ? Math.exp(-4 * tap) * Math.sin(15 * tap) : 0;
          r.cr.setAttribute("width", ((r.len + 10) * w).toFixed(1));
          if (r.free) {
            const tau = t - a - 1.1, rot = -3 + (tau > 0 ? 3 * Math.exp(-5 * tau) * Math.sin(16 * tau) : 0) - (1 + Math.sin(now * 1.3)) * 0.8 * seg(tau, 0.6, 1.6) + hop * 4;
            r.tg.setAttribute("transform", `translate(${TX - r.tw / 2} ${r.cy}) rotate(${rot.toFixed(3)}) scale(${(1.7 - 0.7 * kb).toFixed(4)})`);
          } else r.tg.setAttribute("transform", `translate(${(TX - r.tw / 2 + 130 * (1 - kb)).toFixed(2)} ${(r.cy - hop * 5).toFixed(2)}) rotate(${(hop * 4).toFixed(3)})`);
          r.tg.setAttribute("opacity", show.toFixed(3));
          const x1 = RX + (r.len + 14) * w, x2 = TX - (r.tw + 14) * cl(kb) * (1 - o2);
          r.lead.setAttribute("d", x2 - x1 > 12 ? `M${x2.toFixed(1)} ${r.cy + 8} H${x1.toFixed(1)}` : "");
          r.lead.setAttribute("stroke-dashoffset", ((TX - x2) % 11).toFixed(2));
          const ku = (pinned === i ? oc(seg(tap, 0, 0.35)) : 1 - seg(now - r.off, 0, 0.2)) * w;
          r.mark.setAttribute("d", ku > 0.02 ? `M${RX + 2} ${r.cy + 19} H${(RX + 2 + (r.len - 4) * ku).toFixed(1)}` : "");
        });
      };
    },
  };

  /* ---- 2. a paper plane loops from a laptop to a post box with the model ID; another flies back with the reply ---- */
  SC.plane = {
    dur: 13, still: 10.6,
    build(svg, api) {
      head(svg, "How do you call Gemini 4 Argon from the API?", "tap the laptop");
      const DK = 474, S = [186, 268], E = [680, 269], L = [142, 280], RR = 66, N = 96;
      const P1 = (u) => { const f = 2 * Math.PI * sm(seg(u, 0.3, 0.7)); return [lerp(S[0], E[0], u) + RR * Math.sin(f), lerp(S[1], E[1], u) - 26 * Math.sin(Math.PI * u) - RR * (1 - Math.cos(f))]; };
      const P2 = (v) => [lerp(E[0], L[0], v), lerp(E[1], L[1], v) + 56 * Math.sin(2 * Math.PI * v) * sm(seg(v, 0.05, 0.3))];
      const ang = (P, u) => { const a = P(u - 0.004), b = P(u + 0.004); return (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI; };
      const pts = (P) => { const o = []; for (let i = 0; i <= N; i++) o.push(P(i / N)); return o; };
      const T1 = pts(P1), T2 = pts(P2);
      const dpath = (T, k) => { const n = Math.floor(k * N); if (n < 1) return ""; let d = `M${T[0][0].toFixed(1)} ${T[0][1].toFixed(1)}`; for (let i = 1; i <= n; i++) d += ` L${T[i][0].toFixed(1)} ${T[i][1].toFixed(1)}`; return d; };
      const trail = (w, d) => el("path", Object.assign({ stroke: LIL, "stroke-width": w, "stroke-linecap": "round", "stroke-linejoin": "round", "stroke-dasharray": "1 12", fill: "none" }, d ? { d } : {}), svg);
      /* the route is dotted in from the start; the dots grow as each plane passes */
      trail(2, dpath(T1, 1)); trail(2, dpath(T2, 1));
      const tr1 = trail(5), tr2 = trail(5);
      /* the post box */
      el("rect", { x: 672, y: 336, width: 16, height: DK - 336, fill: "#fff", stroke: INK, "stroke-width": 3 }, svg);
      el("rect", { x: 618, y: 372, width: 124, height: 42, rx: 8, fill: YEL, stroke: INK, "stroke-width": 3 }, svg);
      txt(svg, 680, 400, "paid tier", { "text-anchor": "middle", "font-size": 21, "font-weight": 700 });
      const box = el("g", {}, svg);
      el("path", { d: "M600 340 V276 Q600 234 642 234 H718 Q760 234 760 276 V340 Z", fill: BLUE, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, box);
      el("rect", { x: 634, y: 262, width: 92, height: 14, rx: 7, fill: INK }, box);
      el("rect", { x: 614, y: 290, width: 132, height: 38, rx: 8, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, box);
      txt(box, 680, 316, "Gemini API", { "text-anchor": "middle", "font-size": 20, "font-weight": 700 });
      const ding = el("path", { d: "M604 232 L590 218 M642 222 L638 204 M718 222 L722 204", stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, svg);
      /* an earlier attempt, nose down on the desk */
      const dud = plane(svg, SOFT); dud.setAttribute("transform", "translate(426 442) rotate(52) scale(1.1)");
      el("path", { d: "M466 458 l12 -7 M470 468 l14 -2", stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round" }, svg);
      el("path", { d: `M30 ${DK} H770`, stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, svg);
      /* the laptop */
      const lap = el("g", {}, svg);
      el("rect", { x: 44, y: 246, width: 286, height: 240, rx: 18, fill: "#fff", "fill-opacity": 0, stroke: INK, "stroke-width": 2, class: "mg-ring" }, lap);
      el("rect", { x: 76, y: 302, width: 220, height: 152, rx: 12, fill: "#fff", stroke: INK, "stroke-width": 3 }, lap);
      el("rect", { x: 88, y: 314, width: 196, height: 128, rx: 6, fill: SOFT }, lap);
      [LIL, YEL, MINT].forEach((c, i) => el("circle", { cx: 104 + i * 18, cy: 330, r: 5, fill: c, stroke: INK, "stroke-width": 2 }, lap));
      el("rect", { x: 54, y: 452, width: 264, height: 22, rx: 8, fill: LIL, stroke: INK, "stroke-width": 3 }, lap);
      el("rect", { x: 164, y: 452, width: 44, height: 8, rx: 4, fill: "#fff", stroke: INK, "stroke-width": 2 }, lap);
      const defs = el("defs", {}, svg);
      const c1 = el("rect", { x: 98, y: 352, width: 0, height: 28 }, el("clipPath", { id: "mgc-pl1" }, defs)), c2 = el("rect", { x: 98, y: 382, width: 0, height: 28 }, el("clipPath", { id: "mgc-pl2" }, defs));
      const scr = el("g", {}, lap);
      txt(el("g", { "clip-path": "url(#mgc-pl1)" }, scr), 100, 372, "model:", { "font-family": MONO, "font-size": 20, "font-weight": 500 });
      txt(el("g", { "clip-path": "url(#mgc-pl2)" }, scr), 100, 400, "gemini-4-argon", { "font-family": MONO, "font-size": 20, "font-weight": 700 });
      const cur = el("rect", { width: 11, height: 4, rx: 2, fill: INK }, scr);
      button(lap, "Send another request from the laptop", () => api.seek(1.0));
      /* slips and planes */
      const slip = (w, lines) => {
        const g = el("g", {}, svg), h = lines.length > 1 ? 68 : 44;
        el("rect", { x: -w / 2, y: -h / 2, width: w, height: h, rx: 8, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, g);
        lines.forEach(([s, wt], i) => txt(g, -w / 2 + 14, (lines.length > 1 ? -6 : 7) + i * 28, s, { "font-family": MONO, "font-size": 20, "font-weight": wt }));
        return { g, w, h };
      };
      const cord = () => el("path", { stroke: INK, "stroke-width": 2, "stroke-linecap": "round", fill: "none" }, svg);
      const k1 = cord(), k2 = cord();
      const s1 = slip(196, [["model:", 500], ["gemini-4-argon", 700]]), s2 = slip(100, [["output", 700]]);
      const p1 = plane(svg, SKY), p2 = plane(svg, MINT);
      const hang = (s, k, px, py, x, y, r, sc, op) => {
        s.g.setAttribute("transform", `translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${r.toFixed(3)}) scale(${sc.toFixed(4)})`); s.g.setAttribute("opacity", op.toFixed(3));
        const a = (r * Math.PI) / 180, co = Math.cos(a) * sc, si = Math.sin(a) * sc, hx = s.w / 2 - 16, hy = -s.h / 2;
        k.setAttribute("d", `M${px.toFixed(1)} ${py.toFixed(1)} L${(x - hx * co - hy * si).toFixed(1)} ${(y - hx * si + hy * co).toFixed(1)} M${px.toFixed(1)} ${py.toFixed(1)} L${(x + hx * co - hy * si).toFixed(1)} ${(y + hx * si + hy * co).toFixed(1)}`);
      };
      const near = (p, q, m) => { const dx = (q[0] - p[0]) * 0.4, dy = (q[1] - p[1]) * 0.4, n = Math.hypot(dx, dy), f = n > m ? m / n : 1; return [p[0] + dx * f, p[1] + dy * f]; };
      const cap = strip(svg, 508, 740);
      return (t, now) => {
        const out = io(seg(t, 12.2, 12.8)), live = 1 - out;
        /* the screen */
        const n1 = Math.floor(seg(t, 0.1, 0.4) * 6), n2 = Math.floor(seg(t, 0.42, 0.95) * 14);
        c1.setAttribute("width", n1 ? n1 * 12 + 4 : 0); c2.setAttribute("width", n2 ? n2 * 12 + 4 : 0);
        scr.setAttribute("opacity", live.toFixed(3));
        cur.setAttribute("x", n2 >= 14 ? 100 : n1 < 6 ? 102 + n1 * 12 : 102 + n2 * 12); cur.setAttribute("y", n2 >= 14 ? 420 : n1 < 6 ? 370 : 398);
        cur.setAttribute("opacity", Math.sin(now * 5) > -0.2 ? 1 : 0);
        /* the request */
        const u = io(seg(t, 1.6, 5.2)), ul = io(seg(t - 0.16, 1.6, 5.2)), kin = sm(seg(t, 4.6, 5.05)), gone = 1 - seg(t, 4.95, 5.05);
        const a = P1(u), b = near(a, P1(ul), 20), hov = (1 - seg(t, 1.6, 2.0)) * Math.sin(t * 5) * 3, pop = cl(bk(seg(t, 1.0, 1.45), 2.2), 0, 1.4);
        const r1 = u <= 0 ? -10 * seg(t, 1.05, 1.6) : lerp(-10, ang(P1, cl(u, 0.004, 0.996)), seg(u, 0, 0.05));
        p1.setAttribute("transform", `translate(${a[0].toFixed(2)} ${(a[1] + hov).toFixed(2)}) rotate(${r1.toFixed(2)}) scale(${(1.3 * pop * (1 - 0.75 * kin)).toFixed(4)})`);
        p1.setAttribute("opacity", (seg(t, 1.0, 1.1) * gone).toFixed(3));
        const ko = sm(seg(ul, 0, 0.12)), ox = lerp(-2, 0, ko) * (1 - kin), oy = lerp(110, 88, ko) * (1 - kin);
        hang(s1, k1, a[0], a[1] + hov, b[0] + ox, b[1] + oy, cl((a[0] - b[0]) * 0.5, -9, 9) * (1 - kin), 1 - 0.9 * kin, seg(t, 1.05, 1.35) * gone);
        k1.setAttribute("opacity", (seg(t, 1.25, 1.55) * gone).toFixed(3));
        tr1.setAttribute("d", dpath(T1, u)); tr1.setAttribute("opacity", live.toFixed(3));
        /* the post box takes it in, thinks, and answers */
        const sq = Math.sin(Math.PI * seg(t, 5.0, 5.3)) + Math.sin(Math.PI * seg(t, 6.1, 6.4)), wig = 1.6 * Math.sin(t * 26) * Math.sin(Math.PI * seg(t, 5.4, 6.15));
        box.setAttribute("transform", `translate(680 340) rotate(${wig.toFixed(3)}) scale(${(1 + 0.04 * sq).toFixed(4)} ${(1 - 0.06 * sq).toFixed(4)}) translate(-680 -340)`);
        const dg = seg(t, 6.1, 6.7); ding.setAttribute("opacity", dg > 0 && dg < 1 ? Math.abs(Math.sin(dg * 3 * Math.PI)).toFixed(2) : 0);
        /* the reply */
        const v = io(seg(t, 6.3, 9.2)), vl = io(seg(t - 0.14, 6.3, 9.2)), c = P2(v), d = near(c, P2(vl), 16), tau = t - 9.0, sat = seg(t, 9.05, 9.75), land = cl(bk(sat, 1.2), 0, 1.2);
        const hop = tau > 0 ? 7 * Math.exp(-5 * tau) * Math.abs(Math.sin(9 * tau)) : 0, rock = seg(tau, 0.8, 1.6) * Math.sin(now * 1.3) * 1.2;
        const h2 = (((ang(P2, cl(v, 0.004, 0.996)) - 180 + 540) % 360) + 360) % 360 - 180, r2 = lerp(h2, 0, sm(seg(v, 0.86, 1))) + rock;
        const born = cl(bk(seg(t, 6.15, 6.6), 1.6), 0, 1.3);
        p2.setAttribute("transform", `translate(${c[0].toFixed(2)} ${(c[1] - hop).toFixed(2)}) rotate(${r2.toFixed(2)}) scale(${(-1.3 * born).toFixed(4)} ${(1.3 * born).toFixed(4)})`);
        p2.setAttribute("opacity", (seg(t, 6.15, 6.25) * live).toFixed(3));
        const kb2 = sm(seg(vl, 0.15, 0.27)), flut = seg(tau, 1, 1.8) * Math.sin(now * 1.6) * 1.4;
        hang(s2, k2, c[0], c[1] - hop, d[0] + lerp(0, 90, land), d[1] + lerp(64 * kb2, -1, land) - hop * 0.5, lerp(cl((c[0] - d[0]) * 0.5, -9, 9), -4, sat) + flut, lerp(0.3, 1, kb2), seg(vl, 0.16, 0.2) * live);
        k2.setAttribute("opacity", (seg(vl, 0.2, 0.3) * (1 - seg(t, 9.0, 9.3)) * live).toFixed(3));
        tr2.setAttribute("d", dpath(T2, v)); tr2.setAttribute("opacity", live.toFixed(3));
        cap.textContent = t < 5.0 || t >= 12.2 ? "Send a request with the model ID" : t < 9.1 ? "The paid tier of the Gemini API" : "Use the model ID gemini-4-argon on the paid tier of the Gemini API";
      };
    },
  };

  /* ---- 3. a desk named Antigravity; what was on it floats, two cards float up after, and the tag strains on its string ---- */
  SC.floating = {
    dur: 13, still: 10.4,
    build(svg, api) {
      head(svg, "How do you use Gemini 4 Argon in Antigravity?", "tap the desk");
      const TOP = 392, AX = 60, AY = 394, LEN = 216;
      let d0 = -99;
      /* 0 up in the air, 1 down on the desk: a fast fall, one small bounce, a rest, a slow rise */
      const env = (w) => (w < 0 ? 0 : w < 0.36 ? Math.pow(w / 0.36, 2) : w < 0.9 ? 1 - 0.14 * Math.abs(Math.sin(((w - 0.36) / 0.54) * 2 * Math.PI)) * (1 - (w - 0.36) / 0.54) : 1 - io(seg(w, 1.6, 2.9)));
      const cp = el("clipPath", { id: "mgc-desk" }, el("defs", {}, svg));
      el("rect", { x: 0, y: 0, width: 800, height: TOP }, cp);
      const behind = el("g", { "clip-path": "url(#mgc-desk)" }, svg);
      const card = (s, w, fill, mono, x, a, ph) => {
        const g = el("g", {}, behind);
        el("rect", { x: -w / 2, y: -48, width: w, height: 96, rx: 16, fill, stroke: INK, "stroke-width": 3 }, g);
        txt(g, 0, 11, s, { "text-anchor": "middle", "font-size": 31, "font-weight": 700, "font-family": mono ? MONO : SANS });
        return { g, x, a, ph };
      };
      const cards = [card("desktop app", 262, SKY, 0, 322, 2.8, 0.4), card("CLI", 168, MINT, 1, 565, 3.7, 2.2)];
      const shade = [338, 470, 622].map((x) => el("ellipse", { cx: x, cy: TOP - 4, ry: 5, fill: SOFT }, svg));
      const desk = el("g", {}, svg);
      el("rect", { x: 46, y: 382, width: 708, height: 118, rx: 18, fill: "#fff", "fill-opacity": 0, stroke: INK, "stroke-width": 2, class: "mg-ring" }, desk);
      [100, 682].forEach((x) => el("rect", { x, y: 466, width: 18, height: 26, fill: LIL, stroke: INK, "stroke-width": 3 }, desk));
      el("rect", { x: 84, y: 410, width: 632, height: 60, fill: SOFT, stroke: INK, "stroke-width": 3 }, desk);
      el("rect", { x: 56, y: TOP, width: 688, height: 20, rx: 8, fill: LIL, stroke: INK, "stroke-width": 3 }, desk);
      [150, 590].forEach((x) => el("rect", { x, y: 435, width: 60, height: 12, rx: 6, fill: YEL, stroke: INK, "stroke-width": 2.5 }, desk));
      el("rect", { x: 288, y: 421, width: 224, height: 40, rx: 8, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, desk);
      txt(desk, 400, 449, "Antigravity", { "text-anchor": "middle", "font-size": 24, "font-weight": 700 });
      button(desk, "Drop everything back onto the desk", () => { d0 = api.now(); api.poke(); });
      const mk = (x0, y0, x1, y1, r1, a, ph) => ({ g: el("g", {}, svg), x0, y0, x1, y1, r1, a, ph });
      const apple = mk(338, 364, 356, 158, -8, 0.05, 0.3), book = mk(470, 344, 516, 172, 9, 0.3, 1.9), pen = mk(622, 382, 708, 212, -56, 0.55, 3.4);
      el("path", { d: "M0 -22 C-10 -30 -30 -24 -30 -2 C-30 20 -14 30 0 26 C14 30 30 20 30 -2 C30 -24 10 -30 0 -22 Z", fill: YEL, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, apple.g);
      el("path", { d: "M0 -22 Q1 -33 7 -38", stroke: INK, "stroke-width": 3, "stroke-linecap": "round", fill: "none" }, apple.g);
      el("path", { d: "M5 -31 Q16 -45 28 -36 Q17 -25 5 -31 Z", fill: MINT, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, apple.g);
      el("rect", { x: -36, y: -46, width: 72, height: 92, rx: 8, fill: BLUE, stroke: INK, "stroke-width": 3 }, book.g);
      el("path", { d: "M-22 -46 V46", stroke: INK, "stroke-width": 2.5 }, book.g);
      el("rect", { x: -12, y: -30, width: 38, height: 22, rx: 5, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, book.g);
      el("path", { d: "M-4 -19 H18", stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round" }, book.g);
      el("rect", { x: -66, y: -8, width: 16, height: 16, rx: 4, fill: LIL, stroke: INK, "stroke-width": 3 }, pen.g);
      el("rect", { x: -54, y: -8, width: 84, height: 16, fill: YEL, stroke: INK, "stroke-width": 3 }, pen.g);
      el("path", { d: "M30 -8 L56 0 L30 8 Z", fill: "#fff", stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, pen.g);
      el("path", { d: "M46 -3.1 L56 0 L46 3.1 Z", fill: INK, stroke: INK, "stroke-width": 2, "stroke-linejoin": "round" }, pen.g);
      const things = [apple, book, pen];
      /* the tag is tied on, so it gets as far as the string lets it */
      const line = el("path", { stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round", fill: "none" }, svg);
      el("circle", { cx: AX, cy: AY, r: 5, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, svg);
      const tag = el("g", {}, svg);
      el("path", { d: "M-20 0 L-2 -22 H204 V22 H-2 Z", fill: YEL, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, tag);
      el("circle", { r: 5, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, tag);
      txt(tag, 106, 7, "Google AI Ultra", { "text-anchor": "middle", "font-size": 21, "font-weight": 700 });
      const cap = strip(svg, 508, 740);
      return (t, now) => {
        things.forEach((o, i) => {
          const tau = t - o.a - 1.3, k = io(seg(t, o.a, o.a + 1.3)) + (tau > 0 ? 0.05 * Math.exp(-2.4 * tau) * Math.sin(5 * tau) : 0);
          const K = k * (1 - io(seg(t, 12.15 + i * 0.07, 12.85 + i * 0.07))) * (1 - env(now - d0 - i * 0.05)), f = cl(K);
          const x = lerp(o.x0, o.x1, K), y = lerp(o.y0, o.y1, K) + Math.sin(now * 1.15 + o.ph) * 7 * f;
          o.g.setAttribute("transform", `translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${(o.r1 * K + Math.sin(now * 0.8 + o.ph) * 4 * f).toFixed(3)})`);
          shade[i].setAttribute("cx", x.toFixed(1)); shade[i].setAttribute("rx", ((i === 2 ? 58 : 34) * (1 - 0.5 * f)).toFixed(1));
        });
        cards.forEach((c, i) => {
          const tau = t - c.a - 1.0, K = cl(bk(seg(t, c.a, c.a + 1.0), 1.3), 0, 1.2) * (1 - io(seg(t, 12.0 + i * 0.08, 12.6 + i * 0.08))) * (1 - env(now - d0 + 0.05));
          const rot = (tau > 0 ? 2.4 * Math.exp(-3 * tau) * Math.sin(8 * tau) : 0) + Math.sin(now * 0.7 + c.ph) * 1.2;
          c.g.setAttribute("transform", `translate(${c.x} ${(lerp(452, 302, K) + Math.sin(now * 1.0 + c.ph) * 4 * cl(K)).toFixed(2)}) rotate(${rot.toFixed(3)})`);
        });
        const K = 1 - env(now - d0 - 0.12), th = ((7.3 + 3 * Math.sin(now * 0.9)) * Math.PI) / 180, tug = Math.max(0, Math.sin(now * 2.3)) * 2;
        const ex = lerp(86, AX + (LEN - tug) * Math.sin(th), K), ey = lerp(368, AY - (LEN - tug) * Math.cos(th), K), slack = Math.max(0, LEN - Math.hypot(ex - AX, ey - AY));
        tag.setAttribute("transform", `translate(${ex.toFixed(2)} ${ey.toFixed(2)}) rotate(${((-6 + 3 * Math.sin(now * 1.3 + 1)) * K).toFixed(3)})`);
        line.setAttribute("d", `M${AX} ${AY} Q${((AX + ex) / 2 - 0.12 * slack).toFixed(1)} ${((AY + ey) / 2 + 0.6 * slack).toFixed(1)} ${ex.toFixed(1)} ${ey.toFixed(1)}`);
        cap.textContent = t < 3.0 || t >= 12 ? "Sign in to Antigravity with a Google AI Ultra subscription" : t < 4.1 ? "Available in the Antigravity desktop app" : "Available in the Antigravity desktop app and the Antigravity CLI";
      };
    },
  };

  /* ---- title card, 16 by 9 ---- */
  SC.hero = {
    w: 960, h: 540, dur: 1, still: 0,
    build(svg) {
      txt(svg, 66, 112, "Five ways in, and free is not one of them", { "font-size": 25, "font-weight": 500, fill: MUTE });
      txt(svg, 62, 198, "How to Use", { "font-size": 72, "font-weight": 700 });
      const ti = txt(svg, 62, 280, "Gemini 4 Argon", { "font-size": 72, "font-weight": 700 });
      el("path", { d: `M68 310 H${Math.round(56 + ti.getComputedTextLength())}`, stroke: YEL, "stroke-width": 14, "stroke-linecap": "round" }, svg);
      el("rect", { x: 62, y: 348, width: 312, height: 56, rx: 28, fill: SOFT, stroke: INK, "stroke-width": 3 }, svg);
      txt(svg, 218, 385, "Checked 13 Oct 2026", { "text-anchor": "middle", "font-size": 25, "font-weight": 700 });
      el("path", { d: "M70 478 C190 430 280 506 410 468 S560 440 630 476 S720 500 756 484", stroke: LIL, "stroke-width": 5, fill: "none", "stroke-linecap": "round", "stroke-dasharray": "1 16" }, svg);
      el("circle", { cx: 70, cy: 478, r: 11, fill: MINT, stroke: INK, "stroke-width": 3 }, svg);
      el("ellipse", { cx: 770, cy: 488, rx: 64, ry: 9, fill: SOFT }, svg);
      const top = el("g", {}, svg), B = "M0 0 C-30 -40 -112 -70 -112 -122 C-112 -160 -50 -176 0 -176 C50 -176 112 -160 112 -122 C112 -70 30 -40 0 0 Z";
      el("rect", { x: -9, y: -238, width: 18, height: 70, rx: 7, fill: YEL, stroke: INK, "stroke-width": 2.7 }, top);
      el("circle", { cy: -240, r: 14, fill: "#fff", stroke: INK, "stroke-width": 2.7 }, top);
      el("path", { d: B }, el("clipPath", { id: "mgc-top" }, el("defs", {}, top)));
      const body = el("g", { "clip-path": "url(#mgc-top)" }, top);
      el("rect", { x: -120, y: -180, width: 240, height: 190, fill: LIL }, body);
      el("path", { d: "M-120 -180 H120 V-96 Q0 -66 -120 -96 Z", fill: MINT }, body);
      el("path", { d: "M-120 -180 H120 V-128 Q0 -100 -120 -128 Z", fill: BLUE }, body);
      el("path", { d: "M-120 -180 H120 V-156 Q0 -134 -120 -156 Z", fill: YEL }, body);
      const shine = el("ellipse", { cy: -112, rx: 8, ry: 84, fill: "#fff" }, body);
      el("path", { d: "M-120 -156 Q0 -134 120 -156 M-120 -128 Q0 -100 120 -128 M-120 -96 Q0 -66 120 -96", stroke: INK, "stroke-width": 2.7, fill: "none" }, body);
      el("path", { d: B, fill: "none", stroke: INK, "stroke-width": 2.7, "stroke-linejoin": "round" }, top);
      el("path", { d: "M-128 -150 q-16 28 -2 56 M128 -150 q16 28 2 56 M-66 -34 q-14 8 -18 22 M66 -34 q14 8 18 22", stroke: INK, "stroke-width": 2.7, fill: "none", "stroke-linecap": "round" }, top);
      star(svg, 648, 104, 15, SKY); star(svg, 896, 176, 14, MINT); star(svg, 566, 410, 12, YEL);
      return (t, now) => {
        top.setAttribute("transform", `translate(770 484) rotate(${(5 * Math.sin(now * 2.2 + 0.9)).toFixed(2)}) scale(1.06)`);
        shine.setAttribute("cx", (((now * 170 + 196) % 300) - 150).toFixed(1));
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
