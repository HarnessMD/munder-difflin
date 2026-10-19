/* Bright coded scenes for "Codex vs Gemini CLI". Vanilla JS, no library.
   <figure class="mg" data-scene="NAME"> holds a still image; this script swaps in a live SVG.
   Plays only in view, honours reduced motion, "?mgstill" freezes each scene on its still frame. */
(() => {
  const NS = "http://www.w3.org/2000/svg";
  const INK = "#1A1320", YEL = "#FFCA54", BLUE = "#6C8EF5", LIL = "#B69CFF", MINT = "#7FD8AE", SKY = "#9AD8FF", SOFT = "#F1ECF9", MUTE = "#7A6A88";
  const SW = 5;
  const SANS = '"Space Grotesk", system-ui, sans-serif', MONO = '"JetBrains Mono", ui-monospace, monospace';
  const el = (t, a = {}, p) => { const n = document.createElementNS(NS, t); for (const k in a) n.setAttribute(k, a[k]); if (p) p.appendChild(n); return n; };
  const txt = (p, x, y, s, a = {}) => { const n = el("text", Object.assign({ x, y, "font-family": SANS, "font-size": 34, "font-weight": 700, fill: INK }, a), p); n.textContent = s; return n; };
  const cl = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const seg = (t, a, b) => cl((t - a) / (b - a));
  const oc = (x) => 1 - Math.pow(1 - x, 3);
  const ob = (x) => { const c = 1.70158; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
  const io = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const tf = (n, x, y, s = 1, r = 0) => n.setAttribute("transform", `translate(${x} ${y}) rotate(${r}) scale(${s})`);
  const tw = (n) => n.getComputedTextLength();
  const button = (g, label, fn) => {
    g.setAttribute("role", "button"); g.setAttribute("tabindex", "0"); g.setAttribute("aria-label", label); g.classList.add("mg-hit");
    g.addEventListener("click", fn);
    g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); } });
  };
  const stroke = { stroke: INK, "stroke-width": SW, "stroke-linejoin": "round" };
  const line = (p, d, a = {}) => el("path", Object.assign({ d, fill: "none", "stroke-linecap": "round" }, stroke, a), p);
  const rect = (p, x, y, w, h, fill, rx = 16, a = {}) => el("rect", Object.assign({ x, y, width: w, height: h, rx, fill }, stroke, a), p);
  /* a rounded label centred on 0,0 inside its own group */
  const pill = (p, label, fill, o = {}) => {
    const h = o.h || 76, fs = o.fs || 36, g = el("g", {}, p);
    const r = rect(g, 0, -h / 2, 10, h, fill, o.rx == null ? h / 2 : o.rx);
    const t = txt(g, 0, fs * 0.36, label, { "text-anchor": "middle", "font-size": fs, "font-weight": o.wt || 700, "font-family": o.mono ? MONO : SANS });
    const w = tw(t) + (o.pad || 48);
    r.setAttribute("x", -w / 2); r.setAttribute("width", w);
    return { g, w, h, t };
  };

  const SC = {};

  /* ---- 1. the Gemini CLI guest list: three ticked, three sent on to Antigravity CLI ---- */
  SC.guestlist = {
    w: 1600, h: 1200, dur: 11, still: 9.6,
    build(svg) {
      const all = el("g", {}, svg);
      txt(all, 60, 118, "Who can still use Gemini CLI?", { "font-size": 60 });
      line(all, "M60 1100 H1540");
      // the door
      rect(all, 60, 230, 280, 870, SOFT, 12);
      rect(all, 84, 254, 232, 846, BLUE, 8);
      rect(all, 112, 420, 150, 250, "none", 10);
      rect(all, 112, 730, 150, 320, "none", 10);
      el("circle", Object.assign({ cx: 290, cy: 700, r: 13, fill: YEL }, stroke), all);
      const plate = pill(all, "Gemini CLI", "#fff", { rx: 12, pad: 30 }); tf(plate.g, 200, 330);
      // the clipboard, hung on a nail
      line(all, "M594 232 L650 194 L706 232");
      el("circle", { cx: 650, cy: 192, r: 9, fill: INK }, all);
      rect(all, 380, 250, 540, 810, YEL, 26);
      rect(all, 410, 310, 480, 720, "#fff", 12);
      rect(all, 560, 226, 180, 70, LIL, 16);
      rect(all, 625, 247, 50, 22, "#fff", 11);
      txt(all, 440, 392, "Who can sign in", { "font-size": 38 });
      line(all, "M440 422 H860", { stroke: SOFT });
      const YS = [482, 572, 662, 786, 876, 966];
      const LAB = ["paid Gemini API key", "Vertex AI", "Code Assist licence", "free", "Google AI Pro", "Google AI Ultra"];
      const rows = LAB.map((s, i) => {
        const g = el("g", {}, all); tf(g, 0, YS[i]);
        const bx = rect(g, 440, -22, 44, 44, "#fff", 8);
        const t = txt(g, 506, 12, s, { "font-weight": 500 });
        const mk = el("g", {}, g); tf(mk, 462, 0);
        line(mk, i < 3 ? "M-12 1 L-3 10 L13 -9" : "M-10 -10 L10 10 M10 -10 L-10 10");
        const w = tw(t);
        const st = i < 3 ? null : line(g, `M500 1 H${512 + w}`);
        if (st) { st.setAttribute("stroke-dasharray", w + 12); }
        return { g, bx, t, mk, st, w };
      });
      // the arrow
      const arrow = el("g", {}, all);
      line(arrow, "M934 920 C1004 920 1000 790 1058 790");
      line(arrow, "M1038 772 L1060 790 L1038 808");
      // the second card
      const card = el("g", {}, all), CX = 1310;
      el("rect", { x: 1080, y: 250, width: 460, height: 810, rx: 26, fill: "#fff" }, card);
      el("path", { d: "M1080 380 V276 Q1080 250 1106 250 H1514 Q1540 250 1540 276 V380 Z", fill: LIL }, card);
      line(card, "M1080 380 H1540");
      rect(card, 1080, 250, 460, 810, "none", 26);
      txt(card, CX, 332, "Antigravity CLI", { "text-anchor": "middle", "font-size": 44 });
      const date = pill(card, "18 Jun 2026", YEL, { mono: true, fs: 36, h: 72 }); tf(date.g, CX, 468);
      const SLOT = [620, 772, 924];
      const chips = [3, 4, 5].map((r, k) => {
        const c = pill(all, LAB[r], SKY, { fs: 38, h: 84, wt: 500 });
        return { c, sx: 506 + rows[r].w / 2, sy: YS[r], ex: CX, ey: SLOT[k], s: 5.2 + k * 0.9 };
      });
      return (t) => {
        all.setAttribute("opacity", 1 - seg(t, 10.5, 11));
        rows.forEach((r, i) => {
          const k = oc(seg(t, 0.3 + i * 0.28, 0.7 + i * 0.28));
          r.g.setAttribute("opacity", k); tf(r.g, -30 * (1 - k), YS[i]);
          const m = i < 3 ? seg(t, 2.3 + i * 0.3, 2.6 + i * 0.3) : seg(t, 3.4 + (i - 3) * 0.3, 3.7 + (i - 3) * 0.3);
          r.bx.setAttribute("fill", m > 0 ? (i < 3 ? MINT : SOFT) : "#fff");
          r.mk.setAttribute("opacity", m > 0 ? 1 : 0); tf(r.mk, 462, 0, cl(ob(m), 0, 1.2));
          if (r.st) r.st.setAttribute("stroke-dashoffset", (r.w + 12) * (1 - seg(t, 3.5 + (i - 3) * 0.3, 3.9 + (i - 3) * 0.3)));
        });
        const c = oc(seg(t, 4.3, 5.0));
        card.setAttribute("opacity", c); card.setAttribute("transform", `translate(${60 * (1 - c)} 0)`);
        arrow.setAttribute("opacity", seg(t, 4.8, 5.2));
        chips.forEach((h, k) => {
          const p = io(seg(t, h.s, h.s + 1.2)), on = t >= h.s;
          const mx = (h.sx + h.ex) / 2 + 40, my = Math.min(h.sy, h.ey) - 40;
          const x = (1 - p) * (1 - p) * h.sx + 2 * (1 - p) * p * mx + p * p * h.ex, y = (1 - p) * (1 - p) * h.sy + 2 * (1 - p) * p * my + p * p * h.ey;
          h.c.g.setAttribute("opacity", on ? 1 : 0); tf(h.c.g, x, y, 1 + 0.08 * Math.sin(p * Math.PI));
          rows[3 + k].t.setAttribute("fill", on ? MUTE : INK); rows[3 + k].st.setAttribute("stroke", on ? MUTE : INK);
        });
      };
    },
  };

  /* ---- 2. the Codex plan cake: tap a tier ---- */
  SC.cake = {
    w: 1600, h: 1200, dur: 12.4, still: 8.0,
    build(svg, api) {
      txt(svg, 60, 118, "What does Codex cost?", { "font-size": 60 });
      txt(svg, 1540, 116, "tap a tier", { "text-anchor": "end", "font-size": 32, "font-weight": 500, fill: MUTE });
      rect(svg, 100, 900, 920, 32, SOFT, 16);
      el("path", Object.assign({ d: "M500 932 L470 990 H650 L620 932 Z", fill: SOFT }, stroke), svg);
      const TI = [
        { name: "Free", price: "$0", fill: SKY, x: 150, w: 820, y: 770, line: "Free, $0: the desktop app, subject to rollout" },
        { name: "Go", price: "$8", fill: MINT, x: 220, w: 680, y: 640, line: "Go, $8 a month: the desktop app, subject to rollout" },
        { name: "Plus", price: "$20", fill: YEL, x: 290, w: 540, y: 510, line: "Plus, $20 a month: web, CLI, IDE extension and iOS" },
        { name: "Pro", price: "from $100", fill: LIL, x: 360, w: 400, y: 380, line: "Pro: $100, $200 or $500, Ultrafast mode on $500" },
      ];
      const H = 130;
      let pinned = -1;
      const tiers = TI.map((ti, i) => {
        const g = el("g", {}, svg), body = el("g", {}, g), { x, y, w } = ti;
        rect(body, x, y, w, H, ti.fill, 16);
        let d = `M${x} ${y + 16} Q${x} ${y} ${x + 16} ${y} H${x + w - 16} Q${x + w} ${y} ${x + w} ${y + 16} V${y + 30}`;
        const n = Math.max(3, Math.round(w / 70)), s = w / n;
        for (let j = n - 1; j >= 0; j--) d += ` Q${x + s * j + s / 2} ${y + 62} ${x + s * j} ${y + 30}`;
        el("path", Object.assign({ d: d + " Z", fill: "#fff" }, stroke), body);
        const a = txt(body, 0, y + 108, ti.name, { "font-size": 44 }), b = txt(body, 0, y + 108, ti.price, { "font-size": 40, "font-family": MONO });
        const wa = tw(a), wb = tw(b), x0 = x + w / 2 - (wa + 20 + wb) / 2;
        a.setAttribute("x", x0); b.setAttribute("x", x0 + wa + 20);
        rect(g, x - 12, y - 12, w + 24, H + 24, "none", 24, { class: "mg-ring", "stroke-dasharray": "6 12" });
        button(g, `${ti.name}, ${ti.price}: ${ti.line}`, () => { pinned = i; api.poke(); });
        return { g, body, px: x - 40, py: y + 65 };
      });
      // candle on top
      const candle = el("g", {}, svg);
      rect(candle, 545, 296, 30, 96, SKY, 8);
      const flame = el("path", Object.assign({ d: "M0 -50 Q26 -14 0 0 Q-26 -14 0 -50 Z", fill: YEL }, stroke), candle);
      // flag on Plus
      const flag = el("g", {}, svg);
      line(flag, "M795 532 V214");
      const fl = txt(flag, 822, 270, "CLI starts here", { "font-size": 34 });
      const FW = tw(fl) + 54;
      const cloth = el("path", Object.assign({ d: `M795 216 H${795 + FW + 30} L${795 + FW + 4} 256 L${795 + FW + 30} 296 H795 Z`, fill: YEL }, stroke), flag);
      flag.insertBefore(cloth, fl);
      // the Business slice
      const sl = el("g", {}, svg), slb = el("g", {}, sl);
      el("rect", { x: 1150, y: 360, width: 390, height: 540, fill: "#fff", "fill-opacity": 0 }, slb);
      txt(slb, 1350, 420, "Business", { "text-anchor": "middle", "font-size": 48 });
      txt(slb, 1350, 478, "$20 per user", { "text-anchor": "middle", "font-size": 38, "font-family": MONO });
      rect(slb, 1160, 862, 380, 32, SOFT, 16);
      rect(slb, 1190, 590, 320, 272, BLUE, 10);
      rect(slb, 1190, 700, 320, 40, "#fff", 0);
      el("path", Object.assign({ d: "M1190 592 L1258 516 L1510 592 Z", fill: "#fff" }, stroke), slb);
      let sd = "M1190 592 H1510 V614"; for (let j = 4; j >= 0; j--) sd += ` Q${1190 + 64 * j + 32} 646 ${1190 + 64 * j} 614`;
      el("path", Object.assign({ d: sd + " Z", fill: "#fff" }, stroke), slb);
      [[1258, 566, MINT], [1314, 576, YEL], [1376, 574, LIL], [1436, 582, SKY]].forEach(([x, y, f], i) => el("rect", { x: x - 10, y: y - 6, width: 20, height: 12, rx: 6, fill: f, transform: `rotate(${i % 2 ? 30 : -25} ${x} ${y})` }, slb));
      rect(sl, 1146, 356, 394, 548, "none", 24, { class: "mg-ring", "stroke-dasharray": "6 12" });
      const BIZ = { line: "Business, $20 per user: billed annually for 2 or more users", fill: BLUE };
      button(sl, BIZ.line, () => { pinned = 4; api.poke(); });
      // pointer and the line from the post
      const ptr = el("path", Object.assign({ d: "M-22 -20 L14 0 L-22 20 Z", fill: YEL }, stroke), svg);
      rect(svg, 60, 1030, 1480, 110, SOFT, 55, { stroke: "none" });
      const dot = el("circle", Object.assign({ r: 16, cy: 1085 }, stroke), svg);
      const cap = txt(svg, 820, 1098, "", { "text-anchor": "middle", "font-size": 36, "font-weight": 500 });
      const PTR = tiers.map((x) => [x.px, x.py]).concat([[1124, 726]]);
      const FILL = TI.map((x) => x.fill).concat([BIZ.fill]), LINE = TI.map((x) => x.line).concat([BIZ.line]);
      return (t) => {
        const b = pinned >= 0 ? 99 : t;
        tiers.forEach((r, i) => {
          const s = 0.3 + i * 0.5, f = seg(b, s, s + 0.45), q = seg(b, s + 0.45, s + 0.8), ti = TI[i];
          const sy = 1 - 0.07 * Math.sin(q * Math.PI), base = ti.y + H;
          r.body.setAttribute("transform", `translate(0 ${-240 * (1 - f * f)}) translate(0 ${base}) scale(1 ${sy}) translate(0 ${-base})`);
          r.g.setAttribute("opacity", seg(b, s, s + 0.1));
        });
        const c = ob(seg(b, 2.3, 2.7));
        candle.setAttribute("opacity", c > 0 ? 1 : 0); candle.setAttribute("transform", `translate(560 392) scale(${cl(c, 0, 1.2)}) translate(-560 -392)`);
        tf(flame, 560, 290, 1 + 0.06 * Math.sin(t * 13));
        const fk = seg(b, 2.7, 3.3);
        flag.setAttribute("opacity", fk > 0 ? 1 : 0); flag.setAttribute("transform", `rotate(${-14 * (1 - oc(fk)) * Math.cos(fk * 9)} 795 532)`);
        const sk = oc(seg(b, 3.2, 3.9));
        sl.setAttribute("opacity", sk); slb.setAttribute("transform", `translate(${240 * (1 - sk)} 0)`);
        const sel = pinned >= 0 ? pinned : t < 4 ? -1 : Math.floor((t - 4) / 1.6) % 5;
        ptr.setAttribute("opacity", sel < 0 ? 0 : 1);
        if (sel >= 0) tf(ptr, PTR[sel][0] + Math.sin(t * 6) * 5, PTR[sel][1]);
        cap.textContent = sel < 0 ? "Codex plans, checked 19 Oct 2026" : LINE[sel];
        const w = tw(cap); cap.setAttribute("x", 800 + 22);
        dot.setAttribute("cx", 800 + 22 - w / 2 - 36); dot.setAttribute("fill", sel < 0 ? "#fff" : FILL[sel]);
      };
    },
  };

  /* ---- 3. two pots, one sprout for each place it runs ---- */
  SC.sprouts = {
    w: 1600, h: 1200, dur: 10, still: 7.6,
    build(svg) {
      const all = el("g", {}, svg);
      txt(all, 60, 118, "Where does each one run?", { "font-size": 60 });
      const sun = el("g", {}, all), rays = el("g", {}, sun);
      for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; line(rays, `M${Math.cos(a) * 66} ${Math.sin(a) * 66} L${Math.cos(a) * 88} ${Math.sin(a) * 88}`); }
      el("circle", Object.assign({ r: 48, fill: YEL }, stroke), sun); tf(sun, 1440, 210);
      line(all, "M60 1000 H1540");
      const PLANTS = [
        { cx: 420, name: "Codex", fill: YEL, sp: [["terminal", -50, 195, 560, 0.4], ["IDE extension", -18, 265, 370, 1.5, 0.8], ["desktop app", 18, 575, 245, 2.6], ["web", 50, 690, 545, 3.7]] },
        { cx: 1170, name: "Gemini CLI", fill: SKY, sp: [["terminal", -40, 940, 560, 0.8], ["IDE integration", 0, 1120, 300, 1.9], ["headless mode", 40, 1370, 500, 3.0]] },
      ];
      const LEAF = "M0 0 Q26 -22 58 0 Q26 22 0 0 Z";
      const sprouts = [];
      PLANTS.forEach((pl) => {
        const stems = el("g", {}, all), cx = pl.cx;
        pl.sp.forEach(([label, off, tx, ty, s, lf = 0.52]) => {
          const bx = cx + off, by = 790, ey = ty + 38;
          const d = `M${bx} ${by} C${bx} ${by - (by - ey) * 0.5} ${tx} ${ey + (by - ey) * 0.4} ${tx} ${ey}`;
          const p = line(stems, d), L = p.getTotalLength();
          p.setAttribute("stroke-dasharray", L);
          const m = p.getPointAtLength(L * lf), m2 = p.getPointAtLength(L * (lf + 0.02)), ang = Math.atan2(m2.y - m.y, m2.x - m.x) * 180 / Math.PI;
          const leaves = [-58, 58].map((da) => { const g = el("g", {}, stems); el("path", Object.assign({ d: LEAF, fill: MINT }, stroke), g); return { g, r: ang + da }; });
          const tag = pill(all, label, label === "terminal" ? YEL : "#fff", { h: 72, fs: 36 });
          sprouts.push({ p, L, leaves, m, tag, tx, ty, s, i: sprouts.length });
        });
        el("path", Object.assign({ d: `M${cx - 168} 772 Q${cx} 716 ${cx + 168} 772 Z`, fill: MUTE }, stroke), all);
        rect(all, cx - 190, 760, 380, 56, pl.fill, 14);
        el("path", Object.assign({ d: `M${cx - 160} 816 L${cx - 122} 1000 H${cx + 122} L${cx + 160} 816 Z`, fill: pl.fill }, stroke), all);
        const nm = txt(all, cx, 928, pl.name, { "text-anchor": "middle", "font-size": 48 });
        if (tw(nm) > 250) nm.setAttribute("font-size", 48 * 250 / tw(nm));
      });
      sprouts.forEach((sp) => all.appendChild(sp.tag.g));
      const strip = el("g", {}, all);
      rect(strip, 60, 1040, 1480, 100, SOFT, 50, { stroke: "none" });
      txt(strip, 800, 1102, "Both run in the terminal; Codex reaches more places beyond it.", { "text-anchor": "middle", "font-size": 36, "font-weight": 500 });
      return (t) => {
        all.setAttribute("opacity", 1 - seg(t, 9.5, 10));
        rays.setAttribute("transform", `rotate(${t * 18})`);
        sprouts.forEach((sp) => {
          const k = oc(seg(t, sp.s, sp.s + 1.0));
          sp.p.setAttribute("stroke-dashoffset", sp.L * (1 - k)); sp.p.setAttribute("opacity", k > 0 ? 1 : 0);
          const lk = seg(t, sp.s + 0.45, sp.s + 0.85);
          sp.leaves.forEach((l) => { l.g.setAttribute("opacity", lk > 0 ? 1 : 0); tf(l.g, sp.m.x, sp.m.y, cl(ob(lk), 0, 1.2), l.r); });
          const gk = seg(t, sp.s + 0.85, sp.s + 1.25);
          sp.tag.g.setAttribute("opacity", gk > 0 ? 1 : 0);
          tf(sp.tag.g, sp.tx, sp.ty, cl(ob(gk), 0, 1.2), gk >= 1 ? Math.sin(t * 1.6 + sp.i) * 1 : 0);
        });
        strip.setAttribute("opacity", oc(seg(t, 4.9, 5.5)));
      };
    },
  };

  /* ---- title card, 16 by 9: a string telephone ---- */
  SC.hero = {
    w: 1600, h: 900, dur: 6, still: 4,
    build(svg) {
      const k = el("g", {}, svg);
      const kr = rect(k, 60, 118, 10, 60, SOFT, 30, { stroke: "none" });
      const kt = txt(k, 84, 159, "Comparisons", { "font-size": 32, fill: MUTE });
      kr.setAttribute("width", tw(kt) + 48);
      txt(svg, 56, 350, "Codex vs", { "font-size": 150 });
      txt(svg, 56, 510, "Gemini CLI", { "font-size": 150 });
      el("rect", { x: 64, y: 548, width: 520, height: 18, rx: 9, fill: YEL }, svg);
      txt(svg, 60, 650, "Plans, limits, who can use each", { "font-size": 40, "font-weight": 500, fill: MUTE });
      txt(svg, 60, 750, "Checked 19 Oct 2026", { "font-size": 34, "font-family": MONO });
      const dots = [[1000, 210, SKY, 0], [1170, 250, LIL, 1], [985, 430, MINT, 1], [1490, 470, MINT, 0], [1420, 690, YEL, 1], [1230, 770, SKY, 0]].map(([x, y, f, sq]) => {
        const n = sq ? el("rect", { x: -11, y: -11, width: 22, height: 22, rx: 5, fill: f }) : el("circle", { r: 12, fill: f });
        svg.appendChild(n); return { n, x, y };
      });
      const str = line(svg, "");
      const arcs = [44, 74, 104].map(() => line(svg, "", { stroke: BLUE }));
      const cup = (bx, by, rot, fill, band) => {
        const g = el("g", {}, svg);
        el("path", Object.assign({ d: "M0 -44 L-150 -74 L-150 74 L0 44 Z", fill }, stroke), g);
        el("path", Object.assign({ d: "M-55 -55 L-95 -63 L-95 63 L-55 55 Z", fill: band }, stroke), g);
        el("ellipse", Object.assign({ cx: -150, cy: 0, rx: 20, ry: 74, fill: SOFT }, stroke), g);
        el("ellipse", Object.assign({ cx: 0, cy: 0, rx: 9, ry: 44, fill }, stroke), g);
        tf(g, bx, by, 1, rot); return g;
      };
      const A = cup(1080, 640, -45, "#fff", LIL), B = cup(1360, 310, 135, "#fff", BLUE);
      const ux = 280 / Math.hypot(280, 330), uy = -330 / Math.hypot(280, 330), px = uy, py = -ux; // along, and up-left across
      return (t) => {
        const v = Math.sin(t * 14) * 6 * (0.6 + 0.4 * Math.sin(t * 1.7));
        str.setAttribute("d", `M1080 640 Q${1220 + 34 + px * v} ${475 + 34 + py * v} 1360 310`);
        arcs.forEach((a, i) => {
          const r = arcs.length && [44, 74, 104][i], ph = ((t * 0.9 - i * 0.22) % 1 + 1) % 1;
          const c0 = Math.atan2(py, px), h = 0.5, cx = 1220 + 20, cy = 475 + 20;
          a.setAttribute("d", `M${cx + Math.cos(c0 - h) * r} ${cy + Math.sin(c0 - h) * r} A${r} ${r} 0 0 1 ${cx + Math.cos(c0 + h) * r} ${cy + Math.sin(c0 + h) * r}`);
          a.setAttribute("opacity", ph < 0.62 ? 1 : 0);
        });
        A.setAttribute("transform", `translate(1080 640) rotate(${-45 + Math.sin(t * 2) * 2})`);
        B.setAttribute("transform", `translate(1360 310) rotate(${135 + Math.sin(t * 2 + 1) * 2})`);
        dots.forEach((d, i) => tf(d.n, d.x, d.y + Math.sin(t * 1.8 + i) * 6, 1 + 0.12 * Math.sin(t * 2.4 + i * 1.3), t * 20 * (i % 2 ? 1 : -1)));
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
