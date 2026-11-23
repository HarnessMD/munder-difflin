/* Bright coded scenes for "Inkling 2 Mini". Vanilla JS, no library.
   <figure class="mg" data-scene="NAME"> holds a still image; this script swaps in a live SVG.
   Plays only in view, honours reduced motion, "?mgstill" freezes each scene on its still frame. */
(() => {
  const NS = "http://www.w3.org/2000/svg";
  const INK = "#1A1320", YEL = "#FFCA54", BLUE = "#6C8EF5", LIL = "#B69CFF", MINT = "#7FD8AE", SKY = "#9AD8FF", SOFT = "#F1ECF9", MUTE = "#7A6A88";
  const SANS = '"Space Grotesk", system-ui, sans-serif', MONO = '"JetBrains Mono", ui-monospace, monospace';
  const el = (t, a = {}, p) => { const n = document.createElementNS(NS, t); for (const k in a) n.setAttribute(k, a[k]); if (p) p.appendChild(n); return n; };
  const txt = (p, x, y, s, a = {}) => { const n = el("text", Object.assign({ x, y, "font-family": SANS, "font-size": 24, "font-weight": 600, fill: INK }, a["font-family"] === MONO ? { "word-spacing": -0.22 * (a["font-size"] || 24) } : {}, a), p); n.textContent = s; return n; };
  const cl = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const seg = (t, a, b) => cl((t - a) / (b - a));
  const oc = (x) => 1 - Math.pow(1 - x, 3);
  const ob = (x) => { const c = 1.70158; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
  const io = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const tf = (n, x, y, s = 1, r = 0) => n.setAttribute("transform", `translate(${x} ${y}) rotate(${r}) scale(${s})`);
  const sat = (n, x, y, sx, sy = sx) => n.setAttribute("transform", `translate(${x} ${y}) scale(${sx} ${sy}) translate(${-x} ${-y})`);
  const show = (n, o) => n.setAttribute("opacity", cl(o));
  const nz = (v) => Math.max(0.001, v);
  const swing = (u, a) => a * Math.exp(-3 * u) * Math.cos(8 * u); // a tag settling on its string
  const button = (g, label, fn) => {
    g.setAttribute("role", "button"); g.setAttribute("tabindex", "0"); g.setAttribute("aria-label", label); g.classList.add("mg-hit");
    g.addEventListener("click", fn);
    g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); } });
  };
  // one tap target with a dashed focus ring (shown on keyboard focus, half shown on hover)
  const hit = (p, x, y, w, h, rx, label, fn) => {
    const g = el("g", {}, p);
    const rg = el("rect", { fill: "none", stroke: INK, "stroke-width": 2.5, "stroke-dasharray": "6 8", rx: rx + 6, class: "mg-ring" }, g);
    const pad = el("rect", { rx, fill: "#fff", "fill-opacity": 0 }, g);
    const set = (x, y, w, h) => { [["x", x], ["y", y], ["width", w], ["height", h]].forEach(([k, v]) => pad.setAttribute(k, v)); [["x", x - 6], ["y", y - 6], ["width", w + 12], ["height", h + 12]].forEach(([k, v]) => rg.setAttribute(k, v)); };
    set(x, y, w, h); button(g, label, fn);
    return { g, set };
  };
  // distance along the track at time u for a car that speeds up, cruises and brakes (a, d in seconds)
  const trap = (S, T, a, d) => { const v = S / (T - a / 2 - d / 2); return (u) => { if (u <= 0) return 0; if (u >= T) return S; if (u < a) return (0.5 * v * u * u) / a; if (u <= T - d) return 0.5 * v * a + v * (u - a); const r = T - u; return S - (0.5 * v * r * r) / d; }; };
  // a luggage tag hung from a hole at 0,0
  const tag = (p, w, h, fill, label, fs) => {
    const g = el("g", {}, p), a = w / 2;
    el("path", { d: `M${-a + 12} -10 H${a - 12} L${a} 2 V${h - 16} Q${a} ${h - 10} ${a - 6} ${h - 10} H${-a + 6} Q${-a} ${h - 10} ${-a} ${h - 16} V2 Z`, fill, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, g);
    el("circle", { cx: 0, cy: 1, r: 4.5, fill: "#fff", stroke: INK, "stroke-width": 2 }, g);
    txt(g, 0, h - 20, label, { "text-anchor": "middle", "font-family": MONO, "font-size": fs, "font-weight": 700 });
    return g;
  };
  // the coaster car, drawn with its wheels on the track line at 0,0
  const mkCar = (p, s = 1) => {
    const g = el("g", {}, p), b = el("g", { transform: `scale(${s})` }, g);
    el("rect", { x: -31, y: -58, width: 16, height: 20, rx: 5, fill: YEL, stroke: INK, "stroke-width": 3 }, b);
    [-19, 19].forEach((x) => el("circle", { cx: x, cy: -13, r: 6.5, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, b));
    el("rect", { x: -33, y: -44, width: 66, height: 28, rx: 10, fill: YEL, stroke: INK, "stroke-width": 3 }, b);
    el("path", { d: "M-20 -34 H20", stroke: "#fff", "stroke-width": 4, "stroke-linecap": "round" }, b);
    return g;
  };
  // a straight track with one loop; posts are [x, top] uprights standing on the ground
  const coaster = (p, o) => {
    const { x0, x1, cx, y, r, gy } = o, cy = y - r;
    const ground = el("rect", { x: o.ground[0], y: gy, width: o.ground[1] - o.ground[0], height: 12, rx: 6, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, p);
    const ups = o.posts.slice().sort((a, b) => a[0] - b[0]).map(([x, top]) => ({ x, n: el("rect", { x: x - 6, y: top, width: 12, height: gy - top, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, p) }));
    const trk = el("g", {}, p), line = `M${x0 - 34} ${y} H${x1 + 34}`;
    el("path", { d: line, stroke: INK, "stroke-width": 17, "stroke-linecap": "round", fill: "none" }, trk);
    el("circle", { cx, cy, r, stroke: INK, "stroke-width": 17, fill: "none" }, trk);
    el("path", { d: line, stroke: o.track, "stroke-width": 11, "stroke-linecap": "round", fill: "none" }, trk);
    el("circle", { cx, cy, r, stroke: o.loop, "stroke-width": 11, fill: "none" }, trk);
    el("path", { d: `M${x0 - 30} ${y} H${cx - 56} M${cx + 56} ${y} H${x1 + 30}`, stroke: INK, "stroke-width": 2, "stroke-dasharray": "2 12", "stroke-linecap": "round", fill: "none" }, trk);
    const L1 = cx - x0, Ll = 2 * Math.PI * r, S = L1 + 3 * Ll + (x1 - cx);
    const at = (s) => {
      if (s <= L1) return [x0 + s, y, 0];
      if (s >= L1 + 3 * Ll) return [cx + s - L1 - 3 * Ll, y, 0];
      const a = Math.PI / 2 - (s - L1) / r;
      return [cx + r * Math.cos(a), cy + r * Math.sin(a), (Math.atan2(-Math.cos(a), Math.sin(a)) * 180) / Math.PI];
    };
    const enter = (t, t0) => {
      sat(ground, (o.ground[0] + o.ground[1]) / 2, gy, nz(oc(seg(t, t0, t0 + 0.4))), 1);
      ups.forEach((u, i) => sat(u.n, u.x, gy, 1, nz(oc(seg(t, t0 + 0.05 + i * 0.06, t0 + 0.3 + i * 0.06)))));
      const k = oc(seg(t, t0 + 0.15, t0 + 0.5)); show(trk, k); trk.setAttribute("transform", `translate(0 ${14 * (1 - k)})`);
    };
    return { at, S, L1, Ll, enter };
  };
  // a nesting doll outline, bottom centre at 0,0
  const dollPath = (W, H) => {
    const P = [[-0.3, 0], [-0.44, 0], [-0.5, -0.16], [-0.5, -0.32], [-0.5, -0.5], [-0.33, -0.56], [-0.33, -0.63], [-0.33, -0.68], [-0.38, -0.72], [-0.38, -0.8], [-0.38, -0.92], [-0.22, -1], [0, -1]];
    const L = P.map(([x, y]) => [Math.round(x * W * 10) / 10, Math.round(y * H * 10) / 10]), all = L.concat(L.slice(0, -1).reverse().map(([x, y]) => [-x, y]));
    let d = `M${all[0][0]} ${all[0][1]}`;
    for (let i = 1; i < all.length; i += 3) d += ` C${all[i][0]} ${all[i][1]} ${all[i + 1][0]} ${all[i + 1][1]} ${all[i + 2][0]} ${all[i + 2][1]}`;
    return d + " Z";
  };

  const SC = {};

  /* ---- 1. the car loops the middle blocks three times, then rolls on to the Final block ---- */
  SC.rollercoaster = {
    dur: 9, from: 0.8, reset: "out", out: 0.45,
    build(svg, api) {
      const GY = 516, SY = 262, T0 = 1.2, T = 6, T1 = T0 + T;
      const SG = [[150, 180, SKY, "Prelude"], [650, 226, MINT, "Final block"]];
      const legs = []; SG.forEach(([x, w]) => legs.push([x - w / 2 + 26, SY + 28], [x + w / 2 - 26, SY + 28]));
      const co = coaster(svg, { x0: 150, x1: 650, cx: 400, y: 410, r: 112, gy: GY, ground: [50, 750], posts: legs.concat([[160, 414], [290, 414], [510, 414], [640, 414]]), track: SOFT, loop: BLUE });
      const signs = SG.map(([x, w, fill, label]) => {
        const b = el("g", {}, svg);
        el("rect", { x: -w / 2 + 7, y: -21, width: w, height: 56, rx: 16, fill: LIL }, b);
        el("rect", { x: -w / 2, y: -28, width: w, height: 56, rx: 16, fill, stroke: INK, "stroke-width": 3 }, b);
        txt(b, 0, 10, label, { "text-anchor": "middle", "font-size": 28, "font-weight": 700 });
        return { b, x };
      });
      const board = el("g", {}, svg);
      el("rect", { x: -103, y: -38, width: 220, height: 90, rx: 20, fill: SOFT }, board);
      el("rect", { x: -110, y: -45, width: 220, height: 90, rx: 20, fill: LIL, stroke: INK, "stroke-width": 3 }, board);
      const count = txt(board, 0, 8, "Pass 1", { "text-anchor": "middle", "font-family": MONO, "font-size": 34, "font-weight": 700 });
      const pips = [-24, 0, 24].map((x) => el("circle", { cx: x, cy: 27, r: 6.5, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, board));
      const car = mkCar(svg);
      hit(svg, 60, 170, 680, 290, 26, "Send the car around the loop again", api.replay);
      const pos = trap(co.S, T, 1, 1.3), sAt = (t) => pos(t - T0);
      const tp = [0, 1, 2].map((i) => { const goal = co.L1 + i * co.Ll + 0.5; for (let u = T0; u < T1; u += 0.005) if (sAt(u) >= goal) return u; return T1; });
      return (t, now, { out }) => {
        co.enter(t, 0);
        signs.forEach((s, i) => { const k = ob(seg(t, 0.25 + i * 0.1, 0.65 + i * 0.1)), pop = i === 1 ? 0.1 * Math.sin(Math.PI * seg(t, T1 - 0.25, T1 + 0.2)) : 0; tf(s.b, s.x, SY, nz(k + pop)); });
        const n = t >= tp[2] ? 3 : t >= tp[1] ? 2 : 1, kb = seg(t, tp[0] - 0.2, tp[0] + 0.25);
        const pulse = n > 1 ? 0.1 * Math.sin(Math.PI * seg(t, tp[n - 1], tp[n - 1] + 0.3)) : 0;
        count.textContent = `Pass ${n}`;
        pips.forEach((c, j) => c.setAttribute("fill", j < n ? YEL : "#fff"));
        tf(board, 400, 104 - 26 * (1 - oc(kb)) - 16 * out, nz(ob(kb) + pulse));
        show(board, (kb > 0 ? 1 : 0) * (1 - out));
        const [x, y, r] = co.at(sAt(t)), rk = seg(t, T1 - 0.05, T1 + 0.6);
        tf(car, x, y, nz(ob(seg(t, 0.8, 1.15)) * (1 - 0.3 * out)), r + 5 * Math.sin(2 * Math.PI * rk) * (1 - rk));
        show(car, t < 0.8 ? 0 : 1 - out);
      };
    },
  };

  /* ---- 2. weights packed into a suitcase: NVFP4 blocks, one MXFP8 block, lid shut, two tags ---- */
  SC.suitcase = {
    dur: 9, from: 1, reset: "rewind", rw: 1.8,
    build(svg, api) {
      const HY = 250, cam = el("g", {}, svg), cas = el("g", {}, cam);
      const lsh = el("rect", { x: 138, y: 88, width: 540, height: 170, rx: 18, fill: LIL }, cas);
      el("rect", { x: 138, y: 258, width: 540, height: 170, rx: 18, fill: LIL }, cas);
      el("rect", { x: 130, y: 250, width: 540, height: 170, rx: 18, fill: SOFT, stroke: INK, "stroke-width": 3 }, cas);
      el("rect", { x: 146, y: 264, width: 508, height: 142, rx: 10, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, cas);
      const B = [[157.2, 279, 122, 112, BLUE, "NVFP4", 24], [290.4, 279, 122, 112, BLUE, "NVFP4", 24], [423.6, 279, 122, 112, BLUE, "NVFP4", 24], [556.8, 295, 86, 80, LIL, "MXFP8", 20]];
      const blocks = B.map(([x, y, w, h, fill, label, fs], i) => {
        const g = el("g", {}, cas);
        el("rect", { x: x + 5, y: y + 5, width: w, height: h, rx: 10, fill: SOFT }, g);
        el("rect", { x, y, width: w, height: h, rx: 10, fill, stroke: INK, "stroke-width": 3 }, g);
        txt(g, x + w / 2, y + h / 2 + fs * 0.36, label, { "text-anchor": "middle", "font-family": MONO, "font-size": fs, "font-weight": 700 });
        return { g, x, t0: i < 3 ? 1.1 + i * 0.5 : 2.85 };
      });
      const lid = el("g", {}, cas), lin = el("g", {}, lid), lout = el("g", {}, lid);
      el("rect", { x: 130, y: 80, width: 540, height: 170, rx: 18, fill: SOFT, stroke: INK, "stroke-width": 3 }, lin);
      el("rect", { x: 146, y: 94, width: 508, height: 142, rx: 10, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, lin);
      el("rect", { x: 172, y: 150, width: 456, height: 70, rx: 10, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, lin);
      el("path", { d: "M192 167 H608", stroke: INK, "stroke-width": 2, "stroke-dasharray": "2 9", "stroke-linecap": "round" }, lin);
      el("rect", { x: 130, y: 80, width: 540, height: 170, rx: 18, fill: SOFT, stroke: INK, "stroke-width": 3 }, lout);
      el("rect", { x: 164, y: 110, width: 472, height: 110, rx: 14, fill: "none", stroke: INK, "stroke-width": 2.5 }, lout);
      [214, 554].forEach((x) => el("rect", { x, y: 84, width: 32, height: 16, rx: 4, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, lout));
      [206, 554].forEach((x) => el("rect", { x, y: 243, width: 40, height: 14, rx: 4, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, cas));
      const hd = "M368 421 V438 Q368 452 382 452 H418 Q432 452 432 438 V421";
      el("path", { d: hd, stroke: INK, "stroke-width": 15, fill: "none", "stroke-linecap": "round" }, cas);
      el("path", { d: hd, stroke: SOFT, "stroke-width": 9, fill: "none", "stroke-linecap": "round" }, cas);
      [352, 422].forEach((x) => el("rect", { x, y: 412, width: 26, height: 14, rx: 4, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, cas));
      const tags = [[243, YEL, "About 20GB", 176, "M384 456 Q320 460 243 488"], [505, MINT, "32GB or more memory", 286, "M416 456 Q470 460 505 488"]].map(([x, fill, label, w, d], i) => {
        const g = tag(cam, w, 52, fill, label, 22), s = el("path", { d, stroke: INK, "stroke-width": 2.5, fill: "none", "stroke-linecap": "round" }, cam);
        return { s, g, x, t0: 5.6 + i * 0.25 };
      });
      const h = hit(cam, 118, 68, 564, 392, 24, "Unpack and pack the suitcase again", api.replay);
      return (t, now, { rw }) => {
        const e = 0.88 + 0.12 * ob(seg(t, 0, 0.5)), b = Math.sin(Math.PI * seg(t, 5.2, 5.5));
        sat(cas, 400, 420, e * (1 + 0.02 * b), e * (1 - 0.035 * b)); show(cas, oc(seg(t, 0, 0.25)));
        cam.setAttribute("transform", `translate(0 ${20 - 110 * io(seg(t, 4, 5.3))})`);
        blocks.forEach((k) => { const u = seg(t, k.t0, k.t0 + 0.7), bump = 7 * Math.sin(Math.PI * seg(t, k.t0 + 0.6, k.t0 + 0.9)); k.g.setAttribute("transform", `translate(${(860 - k.x) * (1 - oc(u)) - bump} 0)`); show(k.g, t > k.t0 ? 1 : 0); });
        const s = Math.cos(Math.PI * io(seg(t, 4, 5.2))), f = `translate(0 ${HY}) scale(1 ${s}) translate(0 ${-HY})`;
        lid.setAttribute("transform", f); lsh.setAttribute("transform", f);
        show(lin, s > 0 ? 1 : 0); show(lout, s > 0 ? 0 : 1); show(lsh, s > 0 ? 1 : 0);
        tags.forEach((g) => { const a = seg(t, g.t0, g.t0 + 0.2); show(g.s, a); show(g.g, a); tf(g.g, g.x, 487, nz(0.5 + 0.5 * ob(seg(t, g.t0, g.t0 + 0.4))), rw ? 0 : swing(Math.max(0, t - g.t0), 26)); });
        const top = s > 0 ? HY - 170 * s : HY; h.set(118, top - 12, 564, 472 - top);
      };
    },
  };

  /* ---- 3. two nesting dolls side by side on a shelf, neither inside the other ---- */
  SC.matryoshka = {
    dur: 7,
    build(svg, api) {
      const SH = 436, wob = [-99, -99];
      const shelfA = el("g", {}, svg);
      el("path", { d: "M96 424 H704 L730 446 H70 Z", fill: SOFT, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, shelfA);
      const D = [
        { x: 290, W: 250, H: 370, fill: BLUE, sh: LIL, tc: YEL, tw: 180, fs: 24, ty: -0.47, tag: "594B total", name: "Inkling 2 Small", t0: 0.6, tt: 2.6, lt: 4.2, amp: 0.11 },
        { x: 566, W: 150, H: 210, fill: LIL, sh: SOFT, tc: MINT, tw: 142, fs: 19, ty: -0.44, tag: "26.4B total", name: "Inkling 2 Mini", t0: 1.5, tt: 2.9, lt: 4.35, amp: 0.16 },
      ];
      const dolls = D.map((d) => {
        const o = el("g", {}, svg), w = el("g", {}, o), body = dollPath(d.W, d.H), ny = -0.63 * d.H, ty = d.ty * d.H, nx = 0.22 * d.W;
        el("path", { d: body, fill: d.sh, transform: "translate(8 4)" }, w);
        el("path", { d: body, fill: d.fill, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, w);
        el("path", { d: `M${-0.49 * d.W} ${-0.38 * d.H} H${0.49 * d.W}`, stroke: INK, "stroke-width": 2.5 }, w);
        const fy = -0.14 * d.H, fr = 0.065 * d.W;
        for (let i = 0; i < 6; i++) { const a = (i * Math.PI) / 3; el("circle", { cx: Math.cos(a) * fr * 1.25, cy: fy + Math.sin(a) * fr * 1.25, r: fr, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, w); }
        el("circle", { cx: 0, cy: fy, r: fr * 0.8, fill: YEL, stroke: INK, "stroke-width": 2.5 }, w);
        const tg = tag(w, d.tw, 50, d.tc, d.tag, d.fs), str = el("path", { d: `M${-nx} ${ny + 2} L0 ${ty + 1} L${nx} ${ny + 2}`, stroke: INK, "stroke-width": 2.5, fill: "none", "stroke-linejoin": "round", "stroke-linecap": "round" }, w);
        return Object.assign({}, d, { o, w, str, tg, tyy: ty });
      });
      const shelfB = el("g", {}, svg);
      el("rect", { x: 78, y: 454, width: 660, height: 56, rx: 8, fill: LIL }, shelfB);
      el("rect", { x: 70, y: 446, width: 660, height: 56, rx: 8, fill: SOFT, stroke: INK, "stroke-width": 3 }, shelfB);
      const labels = dolls.map((d) => txt(svg, d.x, 482, d.name, { "text-anchor": "middle", "font-family": MONO, "font-size": 24, "font-weight": 700 }));
      dolls.forEach((d, i) => hit(svg, d.x - d.W / 2 - 14, SH - d.H - 14, d.W + 28, d.H + 22, 24, `Wobble the ${d.name} doll`, () => { wob[i] = api.now(); api.poke(); }));
      return (t, now) => {
        const ks = nz(oc(seg(t, 0, 0.6))); sat(shelfA, 400, 446, ks, 1); sat(shelfB, 400, 446, ks, 1);
        let busy = false;
        dolls.forEach((d, i) => {
          const f = seg(t, d.t0, d.t0 + 0.45), q = seg(t, d.t0 + 0.45, d.t0 + 0.95), a = d.amp * Math.sin(2 * Math.PI * q) * (1 - q);
          const u = now - wob[i], on = u >= 0 && u < 2.2, ang = on ? 8 * Math.exp(-2.8 * u) * Math.sin(11 * u) : 0; if (on) busy = true;
          d.o.setAttribute("transform", `translate(${d.x} ${SH - 150 * (1 - f * f)})`); show(d.o, seg(t, d.t0, d.t0 + 0.1));
          d.w.setAttribute("transform", `rotate(${ang}) scale(${1 + a} ${1 - a})`);
          const v = seg(t, d.tt, d.tt + 0.2); show(d.str, v); show(d.tg, v);
          tf(d.tg, 0, d.tyy, nz(0.5 + 0.5 * ob(seg(t, d.tt, d.tt + 0.4))), swing(Math.max(0, t - d.tt), 28) - ang * 0.8);
          const l = oc(seg(t, d.lt, d.lt + 0.5)); show(labels[i], l); labels[i].setAttribute("transform", `translate(0 ${14 * (1 - l)})`);
        });
        return busy;
      };
    },
  };

  /* ---- title card, 16 by 9 ---- */
  SC.hero = {
    w: 960, h: 540, dur: 7.5,
    build(svg) {
      const pill = el("g", {}, svg);
      el("rect", { x: 64, y: 84, width: 138, height: 38, rx: 19, fill: LIL, stroke: INK, "stroke-width": 2.5 }, pill);
      txt(pill, 133, 109.5, "Concepts", { "text-anchor": "middle", "font-family": MONO, "font-size": 18, "font-weight": 700 });
      const lines = [pill, txt(svg, 60, 216, "Inkling 2", { "font-size": 82, "font-weight": 700 }), txt(svg, 60, 302, "Mini", { "font-size": 82, "font-weight": 700 }), txt(svg, 64, 362, "Open weights, about 20GB", { "font-size": 28, "font-weight": 500 }), txt(svg, 64, 404, "Checked 21 Nov 2026", { "font-size": 22, "font-weight": 500, fill: MUTE })];
      const co = coaster(svg, { x0: 480, x1: 745, cx: 610, y: 430, r: 100, gy: 496, ground: [448, 940], posts: [[500, 434], [560, 434], [670, 434], [720, 434]], track: SKY, loop: SKY });
      const cards = ["26.4B total", "3.4B active", "Apache 2.0"].map((s, i) => {
        const g = el("g", {}, svg), y = 362 + i * 44;
        el("rect", { x: 797, y: y + 5, width: 136, height: 36, rx: 10, fill: LIL }, g);
        el("rect", { x: 792, y, width: 136, height: 36, rx: 10, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, g);
        txt(g, 860, y + 24.5, s, { "text-anchor": "middle", "font-family": MONO, "font-size": 17, "font-weight": 700 });
        return g;
      });
      const car = mkCar(svg, 0.9), T0 = 1.25, T = 4.8, T1 = T0 + T, pos = trap(co.S, T, 0.9, 1.2);
      return (t) => {
        lines.forEach((n, i) => { const k = oc(seg(t, 0.05 + i * 0.09, 0.55 + i * 0.09)); show(n, k); n.setAttribute("transform", `translate(0 ${18 * (1 - k)})`); });
        co.enter(t, 0.2);
        const [x, y, r] = co.at(pos(t - T0)), rk = seg(t, T1 - 0.05, T1 + 0.6);
        tf(car, x, y, nz(ob(seg(t, 0.85, 1.2))), r + 5 * Math.sin(2 * Math.PI * rk) * (1 - rk)); show(car, t < 0.85 ? 0 : 1);
        cards.forEach((g, i) => { const k = seg(t, T1 + 0.05 + (2 - i) * 0.1, T1 + 0.5 + (2 - i) * 0.1); show(g, oc(cl(k * 3))); g.setAttribute("transform", `translate(0 ${-22 * (1 - ob(k))})`); });
      };
    },
  };

  /* ---- player: plays once in view and rests on a calm final frame; a tap resets smoothly and replays ---- */
  const q = new URLSearchParams(location.search), frozen = q.has("mgstill"), fixed = parseFloat(q.get("mgstill"));
  const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const mount = (fig) => {
    const sc = SC[fig.dataset.scene], img = fig.querySelector("img"); if (!sc || !img) return;
    const W = sc.w || 800, H = sc.h || 600, from = sc.from || 0;
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, class: "mg-svg", role: "group", "aria-label": img.alt || "" });
    svg.style.aspectRatio = `${W} / ${H}`;
    el("rect", { width: W, height: H, fill: "#fff" }, svg);
    img.replaceWith(svg);
    const base = performance.now(), clock = () => (performance.now() - base) / 1000;
    let t = calm ? sc.dur : 0, mode = calm ? "hold" : "play", k = 0, back = 0, raf = 0, last = 0, seen = false, busy = false, draw = () => false;
    const step = (dt) => {
      if (mode === "play") { t = Math.min(sc.dur, t + dt); if (t >= sc.dur) mode = "hold"; }
      else if (mode !== "hold") {
        k += dt / (mode === "rw" ? sc.rw || 1.6 : sc.out || 0.4);
        if (mode === "rw") t = from + (back - from) * (1 - io(cl(k)));
        if (k >= 1) { k = 0; t = from; mode = "play"; }
      }
    };
    const render = () => { busy = !!draw(t, clock(), { out: mode === "out" ? cl(k) : 0, rw: mode === "rw" }); };
    const loop = () => { const now = clock(); step(cl(now - last, 0, 0.05)); last = now; render(); raf = seen && (mode !== "hold" || busy) ? requestAnimationFrame(loop) : 0; };
    const wake = () => { if (!raf && seen) { last = clock(); raf = requestAnimationFrame(loop); } };
    const api = { now: clock, poke: wake, replay: () => { if (sc.reset === "rewind") { back = t; mode = "rw"; } else mode = "out"; k = 0; wake(); } };
    draw = sc.build(svg, api);
    if (frozen) { draw(isNaN(fixed) ? sc.dur : fixed, 0, { out: 0, rw: false }); return; }
    new IntersectionObserver(([e]) => {
      seen = e.isIntersecting;
      if (seen) { wake(); if (!fig.dataset.sent && window.posthog) { fig.dataset.sent = 1; window.posthog.capture("blog_scene_view", { slug: location.pathname.split("/").filter(Boolean).pop(), scene: fig.dataset.scene }); } }
      else { cancelAnimationFrame(raf); raf = 0; }
    }, { threshold: 0.25 }).observe(fig);
    svg.addEventListener("click", () => { if (!fig.dataset.hit && window.posthog) { fig.dataset.hit = 1; window.posthog.capture("blog_scene_interact", { slug: location.pathname.split("/").filter(Boolean).pop(), scene: fig.dataset.scene }); } });
    render();
  };
  const go = () => document.querySelectorAll("figure.mg[data-scene]").forEach(mount);
  const fonts = document.fonts && document.fonts.load ? Promise.all([document.fonts.load('700 32px "Space Grotesk"'), document.fonts.load('500 20px "Space Grotesk"'), document.fonts.load('700 20px "JetBrains Mono"')]).catch(() => {}) : Promise.resolve();
  const start = () => fonts.then(go, go);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
