/* Blueprint scenes for "GTA 6 engine". Vanilla JS, no library.
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

  /* ---- blueprint kit: blue line work on white drafting paper ---- */
  const NAVY = "#22305E", AQUA = "#3FC6C9", LINE = { fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" };
  let uid = 0;
  const lerp = (a, b, k) => a + (b - a) * k;
  const show = (n, o) => n.setAttribute("opacity", o);
  /* a polyline that drafts itself: call it with k from 0 to 1, it parks the pen dot on its tip */
  const stroke = (p, pts, a = {}) => {
    const n = el("path", Object.assign({ d: pts.map((q, i) => (i ? "L" : "M") + q[0] + " " + q[1]).join(" "), stroke: BLUE, "stroke-width": 5, pathLength: 1, "stroke-dasharray": "1 1", "stroke-dashoffset": 1, opacity: 0 }, LINE, a), p);
    const len = [0]; for (let i = 1; i < pts.length; i++) len.push(len[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    const T = len[len.length - 1];
    const at = (k) => { const s = k * T; let i = 1; while (i < pts.length - 1 && s > len[i]) i++; const u = cl((s - len[i - 1]) / (len[i] - len[i - 1] || 1)); return [lerp(pts[i - 1][0], pts[i][0], u), lerp(pts[i - 1][1], pts[i][1], u)]; };
    return (k, pen) => { k = cl(k); n.setAttribute("stroke-dashoffset", 1 - k); show(n, k > 0.002 ? 1 : 0); if (pen && k > 0.002 && k < 0.998) pen.go(at(k)); };
  };
  const ring = (p, cx, cy, r, a = {}) => {
    const n = el("circle", Object.assign({ cx, cy, r, stroke: BLUE, "stroke-width": 5, pathLength: 1, "stroke-dasharray": "1 1", "stroke-dashoffset": 1, opacity: 0 }, LINE, a), p);
    return (k, pen) => { k = cl(k); n.setAttribute("stroke-dashoffset", 1 - k); show(n, k > 0.002 ? 1 : 0); if (pen && k > 0.002 && k < 0.998) pen.go([cx + Math.cos(k * 6.2832) * r, cy + Math.sin(k * 6.2832) * r]); };
  };
  const mkPen = (p) => {
    const g = el("g", { opacity: 0 }, p); el("circle", { r: 27, fill: LIL, "fill-opacity": 0.42 }, g); el("circle", { r: 11, fill: YEL, stroke: INK, "stroke-width": 3.5 }, g);
    let on = false;
    return { start() { on = false; }, go(q) { on = true; g.setAttribute("transform", `translate(${q[0]} ${q[1]})`); }, end() { show(g, on ? 1 : 0); } };
  };
  const paper = (svg, x, y, w, h) => {
    const id = "mgb" + (++uid), pat = el("pattern", { id, x, y, width: 200, height: 200, patternUnits: "userSpaceOnUse" }, el("defs", {}, svg));
    for (let i = 0; i < 5; i++) el("path", { d: `M${i * 40} 0 V200 M0 ${i * 40} H200`, stroke: BLUE, "stroke-opacity": i ? 0.14 : 0.32, "stroke-width": i ? 1.5 : 2.5, fill: "none" }, pat);
    return el("rect", { x, y, width: w, height: h, fill: `url(#${id})` }, svg);
  };
  const sheet = (svg, W, H) => {
    paper(svg, 0, 0, W, H);
    el("rect", { x: 36, y: 36, width: W - 72, height: H - 72, fill: "none", stroke: NAVY, "stroke-width": 4 }, svg);
    let d = ""; for (let x = 200; x < W; x += 200) d += `M${x} 36 v18 M${x} ${H - 36} v-18 `; for (let y = 200; y < H; y += 200) d += `M36 ${y} h18 M${W - 36} ${y} h-18 `;
    el("path", { d, stroke: NAVY, "stroke-width": 4, fill: "none", "stroke-linecap": "round" }, svg);
  };
  const arrow = (p, x, y, deg) => { const n = el("path", { d: "M0 0 L-30 -11 L-30 11 Z", fill: NAVY, stroke: NAVY, "stroke-width": 3, "stroke-linejoin": "round", opacity: 0 }, p); return (k) => { show(n, k > 0.01 ? 1 : 0); n.setAttribute("transform", `translate(${x} ${y}) rotate(${deg}) scale(${Math.max(k, 0.001)})`); }; };
  const type = (n, s, k) => { const c = Math.round(cl(k) * s.length); if (n._c !== c) { n._c = c; n.textContent = s.slice(0, c); } };
  /* the stamp: falls in large, lands with a squash, throws a ring of short ink ticks */
  const stamp = (p, cx, cy, s, size, rot) => {
    const w = s.length * size * 0.6 + 100, h = size + 72, g = el("g", { opacity: 0 }, p), rays = el("g", {}, g), sh = el("rect", { x: -w / 2, y: -h / 2, width: w, height: h, rx: 16, fill: LIL }, g), b = el("g", {}, g);
    el("rect", { x: -w / 2, y: -h / 2, width: w, height: h, rx: 16, fill: YEL, stroke: INK, "stroke-width": 5.5 }, b);
    el("rect", { x: -w / 2 + 13, y: -h / 2 + 13, width: w - 26, height: h - 26, rx: 7, fill: "none", stroke: INK, "stroke-width": 2.5 }, b);
    txt(b, 0, size * 0.35, s, { "text-anchor": "middle", "font-family": MONO, "font-size": size, "font-weight": 700 });
    const rs = Array.from({ length: 12 }, () => el("path", { stroke: NAVY, "stroke-width": 5, "stroke-linecap": "round" }, rays));
    return (k, E = 1, hv = 0, now = 0) => {
      const fall = seg(k, 0, 0.45), land = seg(k, 0.45, 1), sc = (2.6 - 1.6 * fall * fall) * (1 - 0.1 * Math.sin(land * 6.2832) * (1 - land)) * (1 + 0.03 * hv);
      show(g, seg(k, 0, 0.12) * E);
      g.setAttribute("transform", `translate(${cx} ${cy - 8 * hv}) rotate(${rot - 16 * (1 - fall * fall) + Math.sin(now * 7) * 1.6 * hv}) scale(${sc})`);
      const off = 14 * oc(land) + 8 * hv; sh.setAttribute("transform", `translate(${off} ${off})`);
      rs.forEach((n, i) => { const a = (i / 12) * 6.2832 + 0.26, r0 = 1.08 + 0.32 * oc(land), r1 = r0 + 0.1 * (1 - land), rx = w / 2 + 10, ry = h / 2 + 10; n.setAttribute("d", `M${Math.cos(a) * rx * r0} ${Math.sin(a) * ry * r0} L${Math.cos(a) * rx * r1} ${Math.sin(a) * ry * r1}`); });
      show(rays, land > 0 && land < 1 ? 1 - land * land : 0);
    };
  };
  /* one tap target over the whole sheet, with the focus ring; returns the eased hover amount */
  const tap = (svg, W, H, label, fn) => {
    const g = el("g", {}, svg); el("rect", { width: W, height: H, fill: "#fff", "fill-opacity": 0 }, g);
    el("rect", { x: 16, y: 16, width: W - 32, height: H - 32, rx: 22, fill: "none", stroke: AQUA, "stroke-width": 8, class: "mg-ring" }, g);
    button(g, label, fn);
    const s = { h: 0, on: 0 }; ["pointerenter", "focus"].forEach((e) => g.addEventListener(e, () => { s.on = 1; })); ["pointerleave", "blur"].forEach((e) => g.addEventListener(e, () => { s.on = 0; }));
    return () => (s.h += (s.on - s.h) * 0.12);
  };
  const bump = (t, at, amp = 7) => (t > at ? Math.sin((t - at) * 42) * amp * Math.exp(-(t - at) * 8) : 0);

  const SC = {};

  /* ---- 1. the title block drafts itself, one row at a time ---- */
  SC.titleblock = {
    w: 1600, h: 1200, dur: 11, still: 8,
    build(svg, api) {
      const W = 1600, H = 1200, X0 = 230, X1 = 1390, XM = 740, Y0 = 140, HH = 128, RH = 110, YB = Y0 + HH + 5 * RH, T0 = 2.0, ST = 0.8;
      const ROWS = [["Engine:", "RAGE (reported)"], ["Named by Rockstar:", "no"], ["Version:", "not published"], ["RAGE 9:", "rumour"], ["Unreal:", "no source"]];
      sheet(svg, W, H);
      const all = el("g", {}, svg);
      const shade = el("rect", { x: X0 + 18, y: Y0 + 18, width: X1 - X0, height: YB - Y0, fill: LIL, "fill-opacity": 0.45, opacity: 0 }, all);
      const fillA = el("rect", { x: X0, y: Y0, width: X1 - X0, height: YB - Y0, fill: "#fff", opacity: 0 }, all);
      const fillB = el("rect", { x: X0, y: Y0, width: X1 - X0, height: HH, fill: SOFT, opacity: 0 }, all);
      const bars = ROWS.map((_, i) => el("rect", { x: X0, y: Y0 + HH + i * RH, width: XM - X0, height: RH, fill: SOFT, "fill-opacity": 0.55, opacity: 0 }, all));
      const outer = stroke(all, [[X0, Y0], [X1, Y0], [X1, YB], [X0, YB], [X0, Y0]], { stroke: NAVY, "stroke-width": 7 });
      const headLine = stroke(all, [[X0, Y0 + HH], [X1, Y0 + HH]], { stroke: NAVY, "stroke-width": 5.5 });
      const col = stroke(all, [[XM, Y0 + HH], [XM, YB]], { "stroke-width": 5 });
      const head = txt(all, X0 + 44, Y0 + 87, "Title block", { "font-size": 68, "font-weight": 700, opacity: 0 });
      const symA = ring(all, X1 - 84, Y0 + 64, 34, { stroke: BLUE, "stroke-width": 5 }), symB = ring(all, X1 - 84, Y0 + 64, 14, { stroke: NAVY, "stroke-width": 4 });
      const symC = stroke(all, [[X1 - 138, Y0 + 64], [X1 - 30, Y0 + 64]], { stroke: NAVY, "stroke-width": 3 }), symD = stroke(all, [[X1 - 84, Y0 + 12], [X1 - 84, Y0 + 116]], { stroke: NAVY, "stroke-width": 3 });
      const rows = ROWS.map(([k, v], i) => {
        const y = Y0 + HH + i * RH;
        return { ln: i ? stroke(all, [[X0, y], [X1, y]], { "stroke-width": 4.5 }) : null, key: txt(all, X0 + 44, y + 68, "", { "font-family": MONO, "font-size": 36, "font-weight": 500, fill: NAVY }), val: txt(all, XM + 44, y + 73, v, { "font-size": 52, "font-weight": 700, opacity: 0 }), tk: stroke(all, [[150, y + RH], [190, y + RH]], { stroke: NAVY, "stroke-width": 4 }), k, x: XM + 44 };
      });
      const dl = stroke(all, [[170, Y0 + 12], [170, YB - 12]], { stroke: BLUE, "stroke-width": 5 }), dl0 = stroke(all, [[150, Y0], [X0 - 22, Y0]], { stroke: NAVY, "stroke-width": 4 });
      const da0 = arrow(all, 170, Y0, -90), da1 = arrow(all, 170, YB, 90);
      const DY = YB + 78, db = stroke(all, [[X0 + 12, DY], [X1 - 12, DY]], { stroke: BLUE, "stroke-width": 5 }), de0 = stroke(all, [[X0, YB + 22], [X0, DY + 20]], { stroke: NAVY, "stroke-width": 4 }), de1 = stroke(all, [[X1, YB + 22], [X1, DY + 20]], { stroke: NAVY, "stroke-width": 4 });
      const dba0 = arrow(all, X0, DY, 180), dba1 = arrow(all, X1, DY, 0);
      const st = stamp(all, 810, 1050, "Revision: unknown", 54, -5);
      const pen = mkPen(svg);
      const hov = tap(svg, W, H, "Erase the title block and draft it again", () => api.seek(10.3));
      return (t, now) => {
        const E = 1 - io(seg(t, 10.3, 11)), h = hov();
        pen.start();
        outer(io(seg(t, 0.3, 1.5)) * E, pen);
        const base = oc(seg(t, 1.3, 1.8)) * E; show(fillA, base); show(fillB, base); show(shade, base); shade.setAttribute("transform", `translate(${-18 * (1 - base) + 6 * h} ${-18 * (1 - base) + 6 * h})`);
        headLine(oc(seg(t, 1.4, 1.8)) * E, pen);
        const hk = oc(seg(t, 1.55, 1.95)); show(head, hk * E); head.setAttribute("transform", `translate(${-26 * (1 - hk)} 0)`);
        symA(oc(seg(t, 1.7, 2.1)) * E); symB(oc(seg(t, 1.8, 2.2)) * E); symC(oc(seg(t, 1.9, 2.2)) * E); symD(oc(seg(t, 1.96, 2.26)) * E);
        let grown = 0;
        rows.forEach((r, i) => {
          const ti = T0 + i * ST, g = oc(seg(t, ti, ti + 0.45)); grown += g / 5;
          if (r.ln) r.ln(oc(seg(t, ti - 0.12, ti + 0.3)) * E, pen);
          show(bars[i], g * E);
          type(r.key, r.k, seg(t, ti + 0.12, ti + 0.48) * (E > 0.5 ? 1 : E * 2));
          const vk = seg(t, ti + 0.4, ti + 0.78); show(r.val, cl(vk * 3) * E); r.val.setAttribute("transform", `translate(${40 * (1 - ob(vk))} 0)`);
          r.tk(oc(seg(t, ti + 0.3, ti + 0.5)) * E);
        });
        col(grown * E); dl(grown * E); dl0(oc(seg(t, 1.5, 1.8)) * E); da0(ob(seg(t, 1.8, 2.1)) * E); da1(ob(seg(t, 5.7, 6.0)) * E);
        de0(oc(seg(t, 5.7, 5.9)) * E); db(io(seg(t, 5.8, 6.4)) * E, pen); de1(oc(seg(t, 6.3, 6.5)) * E); dba0(ob(seg(t, 5.8, 6.1)) * E); dba1(ob(seg(t, 6.35, 6.65)) * E);
        st(seg(t, 6.95, 7.75), E, h, now);
        all.setAttribute("transform", `translate(0 ${bump(t, 7.31)})`);
        pen.end();
      };
    },
  };

  /* ---- 2. one frame of work on two dimension lines ---- */
  SC.budget = {
    w: 1600, h: 1200, dur: 11, still: 8,
    build(svg, api) {
      const W = 1600, H = 1200, X0 = 160, COLS = [SKY, LIL, MINT, YEL];
      sheet(svg, W, H);
      const all = el("g", {}, svg);
      const dim = (y, x1, label, names) => {
        const g = el("g", {}, all), w = (x1 - X0) / 4;
        const bands = COLS.map((c, i) => ({ sh: el("rect", { x: X0 + i * w + 10, y: y + 56, height: 108, fill: SOFT, opacity: 0 }, g), r: null, i }));
        bands.forEach((b) => { b.r = el("rect", { x: X0 + b.i * w, y: y + 46, height: 108, fill: COLS[b.i], "fill-opacity": 0.9, stroke: BLUE, "stroke-width": 4.5, opacity: 0 }, g); b.tx = names ? txt(g, X0 + (b.i + 0.5) * w, y + 112, names[b.i], { "text-anchor": "middle", "font-family": MONO, "font-size": 35, "font-weight": 500, fill: NAVY, opacity: 0 }) : null; });
        const e0 = stroke(g, [[X0, y - 70], [X0, y + 154]], { stroke: NAVY, "stroke-width": 4.5 }), e1 = stroke(g, [[x1, y - 70], [x1, y + 154]], { stroke: NAVY, "stroke-width": 4.5 });
        const ln = stroke(g, [[X0 + 14, y], [x1 - 14, y]], { "stroke-width": 8 }), a0 = arrow(g, X0, y, 180), a1 = arrow(g, x1, y, 0);
        const ticks = [1, 2, 3].map((i) => stroke(g, [[X0 + i * w, y - 26], [X0 + i * w, y + 46]], { stroke: NAVY, "stroke-width": 5.5 }));
        const lab = txt(g, (X0 + x1) / 2, y - 46, label, { "text-anchor": "middle", "font-size": 66, "font-weight": 700, opacity: 0 });
        return (t, E, pen) => {
          e0(oc(seg(t, 0, 0.3)) * E, pen); a0(ob(seg(t, 0.25, 0.55)) * E); ln(io(seg(t, 0.25, 1.25)) * E, pen); a1(ob(seg(t, 1.2, 1.5)) * E); e1(oc(seg(t, 1.2, 1.5)) * E);
          const lk = seg(t, 1.3, 1.75); show(lab, cl(lk * 3) * E); lab.setAttribute("transform", `translate(0 ${26 * (1 - ob(lk))})`);
          ticks.forEach((f, i) => f(oc(seg(t, 1.5 + i * 0.1, 1.8 + i * 0.1)) * E));
          bands.forEach((b, i) => {
            const k = oc(seg(t, 1.75 + i * 0.12, 2.25 + i * 0.12)) * E; show(b.r, k > 0.01 ? 1 : 0); b.r.setAttribute("width", Math.max(0.1, w * k)); show(b.sh, k > 0.01 ? 1 : 0); b.sh.setAttribute("width", Math.max(0.1, w * k));
            if (b.tx) { const q = seg(t, 2.0 + i * 0.12, 2.4 + i * 0.12); show(b.tx, cl(q * 3) * E); b.tx.setAttribute("transform", `translate(0 ${18 * (1 - ob(q))})`); }
          });
        };
      };
      const A = dim(330, 1440, "33.3 ms at 30 fps", ["Streaming", "Simulation", "Animation", "Rendering"]);
      const B = dim(760, 800, "16.7 ms at 60 fps", null);
      const half = el("path", { stroke: NAVY, "stroke-width": 4.5, "stroke-dasharray": "3 15", "stroke-linecap": "round", fill: "none", opacity: 0 }, all);
      /* title block in the corner of the sheet */
      const TX = 1060, TY = 1000, TM = 1082, TC = 1290;
      const tbFill = el("rect", { x: TX, y: TY, width: 1564 - TX, height: 1164 - TY, fill: "#fff", opacity: 0 }, all);
      const tb = stroke(all, [[TX, 1164], [TX, TY], [1564, TY]], { stroke: NAVY, "stroke-width": 5 }), tbRow = stroke(all, [[TX, TM], [1564, TM]], { "stroke-width": 4 }), tbCol = stroke(all, [[TC, TY], [TC, 1164]], { "stroke-width": 4 });
      const cell = (x, y, s) => txt(all, x, y, s, { "font-family": MONO, "font-size": 34, "font-weight": 500, fill: NAVY, opacity: 0 });
      const cA = [cell(TX + 30, TY + 54, "30 fps"), cell(TC + 30, TY + 54, "33.3 ms")], cB = [cell(TX + 30, TM + 54, "60 fps"), cell(TC + 30, TM + 54, "16.7 ms")];
      const st = stamp(all, 1185, 845, "same work, half the time", 36, -4);
      const pen = mkPen(svg);
      let swap = false, pending = false, last = 0;
      const hov = tap(svg, W, H, "Swap which line drafts first", () => { pending = true; api.seek(10.3); });
      return (t, now) => {
        if (t < last && pending) { swap = !swap; pending = false; } last = t;
        const E = 1 - io(seg(t, 10.3, 11)), h = hov(), tA = swap ? 3.3 : 0.5, tB = swap ? 0.5 : 3.3;
        pen.start();
        const k0 = oc(seg(t, 0.1, 0.7)) * E; show(tbFill, k0); tb(k0); tbRow(oc(seg(t, 0.4, 0.8)) * E); tbCol(oc(seg(t, 0.5, 0.9)) * E);
        A(t - tA, E, pen); B(t - tB, E, pen);
        cA.forEach((n, i) => show(n, oc(seg(t, tA + 1.4 + i * 0.1, tA + 1.8 + i * 0.1)) * E)); cB.forEach((n, i) => show(n, oc(seg(t, tB + 1.4 + i * 0.1, tB + 1.8 + i * 0.1)) * E));
        const hk = io(seg(t, 6.0, 6.5)) * E; show(half, hk > 0.01 ? 1 : 0); half.setAttribute("d", `M800 500 V${lerp(500, 676, hk)}`);
        st(seg(t, 6.95, 7.75), E, h, now);
        all.setAttribute("transform", `translate(0 ${bump(t, 7.31)})`);
        pen.end();
      };
    },
  };

  /* ---- 3. world streaming: detail near the dot, outlines further out, nothing behind ---- */
  SC.streaming = {
    w: 1600, h: 1200, dur: 11, still: 8,
    build(svg, api) {
      const W = 1600, H = 1200, GX = 172, GY = 370, P = 160, B = 136, NC = 8, NR = 3, BY = 290, CY = GY + P + B / 2, GL = GX - 10, GR = GX + (NC - 1) * P + B + 10, SP = [4, 2, 5, 3], START = -0.75;
      sheet(svg, W, H);
      const all = el("g", {}, svg);
      const blocks = [];
      for (let r = 0; r < NR; r++) for (let c = 0; c < NC; c++) {
        const x = GX + c * P, y = GY + r * P, g = el("g", {}, all);
        const ghost = el("path", { d: `M${x} ${y + 22} V${y} H${x + 22} M${x + B - 22} ${y} H${x + B} V${y + 22} M${x + B} ${y + B - 22} V${y + B} H${x + B - 22} M${x + 22} ${y + B} H${x} V${y + B - 22}`, stroke: BLUE, "stroke-opacity": 0.5, "stroke-width": 3.5, "stroke-dasharray": "2 9", fill: "none", "stroke-linecap": "round", opacity: 0 }, g);
        const sh = el("rect", { x: x + 10, y: y + 10, width: B, height: B, fill: LIL, "fill-opacity": 0.4, opacity: 0 }, g);
        const fill = el("rect", { x, y, width: B, height: B, fill: SKY, opacity: 0 }, g), fw = el("rect", { x, y, width: B, height: B, fill: "#fff", opacity: 0 }, g);
        g.insertBefore(fw, fill);
        const out = stroke(g, [[x, y], [x + B, y], [x + B, y + B], [x, y + B], [x, y]], { "stroke-width": 5.5 });
        const det = stroke(g, [[x + 22, y + 22], [x + B - 22, y + 22], [x + B - 22, y + B - 22], [x + 22, y + B - 22], [x + 22, y + 22], [x + 22, y + 52], [x + B - 22, y + 52], [x + B - 22, y + 84], [x + 22, y + 84], [x + 22, y + B - 22], [x + 68, y + B - 22], [x + 68, y + 84]], { stroke: NAVY, "stroke-width": 3.5 });
        blocks.push({ c, r, ghost, sh, fill, fw, out, det, d: 0.3 + (c + r * 1.4) * 0.075 });
      }
      const bracket = (s) => {
        const g = el("g", { opacity: 0 }, all), p = el("path", Object.assign({ stroke: NAVY, "stroke-width": 4.5 }, LINE), g), tx = txt(g, 0, BY - 36, s, { "text-anchor": "middle", "font-family": MONO, "font-size": 37, "font-weight": 500, fill: NAVY });
        return (a, b, o) => { show(g, o); if (o <= 0 || b - a < 40) return; p.setAttribute("d", `M${a} ${BY - 22}V${BY + 22}M${b} ${BY - 22}V${BY + 22}M${a} ${BY}H${b}M${a + 20} ${BY - 11}L${a} ${BY}L${a + 20} ${BY + 11}M${b - 20} ${BY - 11}L${b} ${BY}L${b - 20} ${BY + 11}`); tx.setAttribute("x", (a + b) / 2); };
      };
      const bU = bracket("Unloaded"), bL = bracket("Loaded"), bD = bracket("Low detail");
      const trail = el("path", { stroke: NAVY, "stroke-width": 4.5, "stroke-dasharray": "3 15", "stroke-linecap": "round", fill: "none", opacity: 0 }, all);
      /* title block in the corner: the key */
      const TX = 812, TY = 1056, CW = [0, 222, 502];
      const tbFill = el("rect", { x: TX, y: TY, width: 1564 - TX, height: 1164 - TY, fill: "#fff", opacity: 0 }, all);
      const tb = stroke(all, [[TX, 1164], [TX, TY], [1564, TY]], { stroke: NAVY, "stroke-width": 5 }), tbc = [1, 2].map((i) => stroke(all, [[TX + CW[i], TY], [TX + CW[i], 1164]], { "stroke-width": 4 }));
      const keys = ["Loaded", "Low detail", "Unloaded"].map((s, i) => {
        const g = el("g", { opacity: 0 }, all), x = TX + CW[i] + 22, y = TY + 32;
        if (i === 0) { el("rect", { x, y, width: 44, height: 44, fill: SKY, "fill-opacity": 0.6, stroke: BLUE, "stroke-width": 4 }, g); el("path", { d: `M${x + 9} ${y + 16} H${x + 35} M${x + 9} ${y + 28} H${x + 35}`, stroke: NAVY, "stroke-width": 3, "stroke-linecap": "round" }, g); }
        if (i === 1) el("rect", { x, y, width: 44, height: 44, fill: "#fff", stroke: BLUE, "stroke-width": 4 }, g);
        if (i === 2) el("path", { d: `M${x} ${y + 12} V${y} H${x + 12} M${x + 32} ${y} H${x + 44} V${y + 12} M${x + 44} ${y + 32} V${y + 44} H${x + 32} M${x + 12} ${y + 44} H${x} V${y + 32}`, stroke: BLUE, "stroke-width": 3.5, "stroke-dasharray": "2 8", fill: "none", "stroke-linecap": "round" }, g);
        txt(g, x + 60, y + 33, s, { "font-family": MONO, "font-size": 29, "font-weight": 500, fill: NAVY });
        return g;
      });
      const st = stamp(all, 440, 1020, "behind you, nothing", 42, -5);
      const dot = el("g", { opacity: 0 }, all), halo = el("circle", { r: 34, fill: LIL, "fill-opacity": 0.45 }, dot), halo2 = el("circle", { r: 34, fill: "none", stroke: NAVY, "stroke-width": 3, "stroke-dasharray": "3 9", "stroke-linecap": "round" }, dot);
      el("circle", { r: 19, fill: YEL, stroke: INK, "stroke-width": 5.5 }, dot);
      const pen = mkPen(svg);
      let idx = 0, from = null, tapAt = -9, px = START, sx = START;
      const hov = tap(svg, W, H, "Move the dot to a new spot", () => { from = px; idx = (idx + 1) % SP.length; tapAt = api.now(); api.seek(5.9); });
      return (t, now) => {
        const E = 1 - io(seg(t, 10.3, 11)), h = hov(), m = (now - tapAt) / 1.15, moving = from != null && m < 1 && now > 0;
        px = moving ? lerp(from, SP[idx], io(cl(m))) : lerp(START, SP[idx], io(seg(t, 2.1, 5.3)));
        if (!moving && t < 5.3) sx = START; else if (moving) sx = from;
        pen.start();
        blocks.forEach((b) => {
          const k = io(seg(t, b.d, b.d + 0.55)), near = Math.max(Math.abs(b.c - px), Math.abs(b.r - 1)), L = (1 - seg(near, 1.12, 1.55)) * seg(t, 1.9, 2.4), U = seg(px - b.c - 1.2, 0, 0.5) * (1 - L), vis = k * (1 - U) * E;
          b.out(vis, t < 1.9 ? pen : null); b.det(io(L) * E); show(b.fill, 0.5 * L * E); show(b.fw, k * (1 - U) * E); show(b.sh, L * E); show(b.ghost, U * E);
        });
        const dk = ob(seg(t, 1.65, 2.05)), X = GX + px * P + B / 2;
        show(dot, seg(t, 1.65, 1.8) * E); dot.setAttribute("transform", `translate(${X} ${CY}) scale(${Math.max(dk, 0.001) * (1 + 0.12 * h)})`);
        halo.setAttribute("r", 34 + 5 * Math.sin(now * 4)); halo2.setAttribute("transform", `rotate(${now * 40}) scale(${1.35 + 0.1 * h})`);
        const X0 = GX + sx * P + B / 2; show(trail, Math.abs(X - X0) > 30 ? 0.75 * E * seg(t, 2.1, 2.3) : 0); trail.setAttribute("d", `M${X0} ${CY} H${X + (X > X0 ? -34 : 34)}`);
        const a = Math.max(GL, GX + (px - 1) * P - 10), b = Math.min(GR, GX + (px + 1) * P + B + 10), bk = (i) => oc(seg(t, 2.7 + i * 0.14, 3.1 + i * 0.14)) * E;
        bL(a, b, bk(0)); bU(GL, a - 22, bk(1) * seg(a - 22 - GL, 60, 130)); bD(b + 22, GR, bk(2) * seg(GR - b - 22, 60, 130));
        const k0 = oc(seg(t, 0.2, 0.8)) * E; show(tbFill, k0); tb(k0); tbc.forEach((f, i) => f(oc(seg(t, 0.5 + i * 0.1, 0.9 + i * 0.1)) * E));
        keys.forEach((g, i) => { const q = seg(t, 5.5 + i * 0.12, 5.9 + i * 0.12); show(g, cl(q * 3) * E); g.setAttribute("transform", `translate(0 ${16 * (1 - ob(q))})`); });
        st(seg(t, 6.95, 7.75), E, h, now);
        all.setAttribute("transform", `translate(0 ${bump(t, 7.31)})`);
        pen.end();
      };
    },
  };

  /* ---- title card, 16 by 9 ---- */
  SC.hero = {
    w: 1600, h: 900, dur: 7, still: 4,
    build(svg) {
      el("rect", { x: 90, y: 70, width: 232, height: 68, rx: 34, fill: YEL, stroke: INK, "stroke-width": 3.5 }, svg);
      txt(svg, 206, 116, "Concepts", { "text-anchor": "middle", "font-size": 34, "font-weight": 700 });
      txt(svg, 1510, 116, "Checked 19 Nov 2026", { "text-anchor": "end", "font-family": MONO, "font-size": 29, "font-weight": 500, fill: MUTE });
      txt(svg, 86, 420, "GTA 6 engine", { "font-size": 124, "font-weight": 700 });
      const ul = stroke(svg, [[98, 474], [330, 474]], { stroke: YEL, "stroke-width": 20 });
      txt(svg, 90, 580, "What powers it, and what", { "font-size": 46, "font-weight": 500, fill: MUTE });
      txt(svg, 90, 640, "developers can learn", { "font-size": 46, "font-weight": 500, fill: MUTE });
      /* the drafting sheet */
      const SX = 950, SY = 190, SW = 560, SH = 620, all = el("g", {}, svg);
      el("rect", { x: SX + 18, y: SY + 18, width: SW, height: SH, fill: LIL, "fill-opacity": 0.5 }, all);
      el("rect", { x: SX, y: SY, width: SW, height: SH, fill: "#fff" }, all); paper(all, SX, SY, SW, SH);
      el("rect", { x: SX, y: SY, width: SW, height: SH, fill: "none", stroke: NAVY, "stroke-width": 5 }, all);
      const bx = SX + 90, bw = 380, by = SY + 150, bh = 190, cy = by + bh / 2;
      const bodyFill = el("rect", { x: bx, y: by, width: bw, height: bh, fill: SOFT, opacity: 0 }, all), headFill = el("rect", { x: bx + 34, y: by - 56, width: bw - 68, height: 56, fill: SKY, "fill-opacity": 0.5, opacity: 0 }, all);
      const body = stroke(all, [[bx, by], [bx + bw, by], [bx + bw, by + bh], [bx, by + bh], [bx, by]], { "stroke-width": 6 });
      const top = stroke(all, [[bx + 34, by], [bx + 34, by - 56], [bx + bw - 34, by - 56], [bx + bw - 34, by]], { "stroke-width": 6 });
      const cyl = [0, 1, 2, 3].map((i) => { const cx = bx + 56 + i * 89.3; return [el("circle", { cx, cy, r: 34, fill: "#fff", opacity: 0 }, all), ring(all, cx, cy, 34, { "stroke-width": 5.5 }), ring(all, cx, cy, 13, { stroke: NAVY, "stroke-width": 4 })]; });
      const pan = stroke(all, [[bx, by + bh], [bx + 44, by + bh + 58], [bx + bw - 44, by + bh + 58], [bx + bw, by + bh]], { "stroke-width": 6 });
      const shaft = stroke(all, [[bx + bw, cy - 26], [bx + bw + 44, cy - 26], [bx + bw + 44, cy + 26], [bx + bw, cy + 26]], { "stroke-width": 6 });
      const axis = el("path", { stroke: NAVY, "stroke-width": 3, "stroke-dasharray": "26 9 3 9", "stroke-linecap": "round", fill: "none", opacity: 0 }, all);
      const DY = by + bh + 112, d0 = stroke(all, [[bx, by + bh + 76], [bx, DY + 18]], { stroke: NAVY, "stroke-width": 4 }), d1 = stroke(all, [[bx + bw, by + bh + 20], [bx + bw, DY + 18]], { stroke: NAVY, "stroke-width": 4 });
      const dl = stroke(all, [[bx + 12, DY], [bx + bw - 12, DY]], { stroke: NAVY, "stroke-width": 4.5 }), a0 = arrow(all, bx, DY, 180), a1 = arrow(all, bx + bw, DY, 0);
      const TX = SX + 130, TY = SY + SH - 96;
      const tbFill = el("rect", { x: TX, y: TY, width: SX + SW - TX, height: 96, fill: "#fff", opacity: 0 }, all);
      const tb = stroke(all, [[TX, SY + SH], [TX, TY], [SX + SW, TY]], { stroke: NAVY, "stroke-width": 5 }), tbc = stroke(all, [[TX + 76, TY], [TX + 76, SY + SH]], { "stroke-width": 4 });
      const s1 = ring(all, TX + 38, TY + 48, 20, { "stroke-width": 4 }), s2 = stroke(all, [[TX + 10, TY + 48], [TX + 66, TY + 48]], { stroke: NAVY, "stroke-width": 3 }), s3 = stroke(all, [[TX + 38, TY + 20], [TX + 38, TY + 76]], { stroke: NAVY, "stroke-width": 3 });
      const name = txt(all, TX + 100, TY + 61, "", { "font-family": MONO, "font-size": 34, "font-weight": 700, fill: NAVY });
      const pen = mkPen(svg);
      return (t) => {
        const E = 1 - io(seg(t, 6.4, 7));
        pen.start();
        ul(oc(seg(t, 0.1, 0.6)));
        body(io(seg(t, 0.3, 1.2)) * E, pen); show(bodyFill, oc(seg(t, 1.1, 1.5)) * E);
        top(io(seg(t, 1.1, 1.6)) * E, pen); show(headFill, oc(seg(t, 1.5, 1.9)) * E);
        cyl.forEach(([f, o, i], n) => { const k = io(seg(t, 1.55 + n * 0.14, 2.0 + n * 0.14)) * E; show(f, k > 0.01 ? 1 : 0); o(k, pen); i(oc(seg(t, 1.9 + n * 0.14, 2.2 + n * 0.14)) * E); });
        pan(io(seg(t, 2.35, 2.75)) * E, pen); shaft(io(seg(t, 2.65, 2.95)) * E, pen);
        const ak = io(seg(t, 2.85, 3.2)) * E; show(axis, ak > 0.01 ? 1 : 0); axis.setAttribute("d", `M${bx - 44} ${cy} H${lerp(bx - 44, bx + bw + 78, ak)}`);
        d0(oc(seg(t, 2.9, 3.1)) * E); dl(io(seg(t, 3.0, 3.4)) * E, pen); d1(oc(seg(t, 3.3, 3.5)) * E); a0(ob(seg(t, 3.0, 3.3)) * E); a1(ob(seg(t, 3.35, 3.65)) * E);
        const k0 = oc(seg(t, 0.2, 0.7)) * E; show(tbFill, k0); tb(k0); tbc(oc(seg(t, 0.5, 0.8)) * E);
        s1(oc(seg(t, 0.7, 1.0)) * E); s2(oc(seg(t, 0.8, 1.0)) * E); s3(oc(seg(t, 0.85, 1.05)) * E);
        type(name, "RAGE (reported)", seg(t, 3.3, 3.8) * (E > 0.5 ? 1 : E * 2));
        pen.end();
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
