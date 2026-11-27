/* Bright coded scenes for "What is Claude-BugHunter?". Vanilla JS, no library.
   <figure class="mg" data-scene="NAME"> holds a still image; this script swaps in a live SVG.
   Plays only in view, honours reduced motion, "?mgstill" freezes each scene on its still frame. */
(() => {
  const NS = "http://www.w3.org/2000/svg";
  const INK = "#1A1320", YEL = "#FFCA54", BLUE = "#6C8EF5", LIL = "#B69CFF", MINT = "#7FD8AE", SKY = "#9AD8FF", SOFT = "#F1ECF9", MUTE = "#7A6A88", WHITE = "#fff";
  const SANS = '"Space Grotesk", system-ui, sans-serif', MONO = '"JetBrains Mono", ui-monospace, monospace';
  let uid = 0;
  const nid = (p) => `mgbh-${p}-${(uid += 1)}`;
  const el = (t, a = {}, p) => { const n = document.createElementNS(NS, t); for (const k in a) n.setAttribute(k, a[k]); if (p) p.appendChild(n); return n; };
  const txt = (p, x, y, s, a = {}) => { const n = el("text", Object.assign({ x, y, "font-family": SANS, "font-size": 24, "font-weight": 600, fill: INK }, a), p); n.textContent = s; return n; };
  const mono = (p, x, y, s, a = {}) => txt(p, x, y, s, Object.assign({ "font-family": MONO, "font-size": 18, "font-weight": 700 }, a));
  const cl = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const seg = (t, a, b) => cl((t - a) / (b - a));
  const lerp = (a, b, k) => a + (b - a) * k;
  const oc = (x) => 1 - Math.pow(1 - x, 3);
  const ob = (x, c = 1.70158) => 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2);
  const io = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const tf = (n, x, y, s = 1, r = 0) => n.setAttribute("transform", `translate(${x} ${y}) rotate(${r}) scale(${s})`);
  const about = (x, y, sx, sy = sx) => `translate(${x} ${y}) scale(${sx} ${sy}) translate(${-x} ${-y})`;
  const button = (g, label, fn) => {
    g.setAttribute("role", "button"); g.setAttribute("tabindex", "0"); g.setAttribute("aria-label", label); g.classList.add("mg-hit");
    g.addEventListener("click", fn);
    g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); } });
  };
  const ring = (g, x, y, w, h, r = 16) => el("rect", { x, y, width: w, height: h, rx: r, fill: "none", stroke: INK, "stroke-width": 2.5, "stroke-dasharray": "6 6", class: "mg-ring" }, g);
  const hitbox = (g, x, y, w, h, r = 16) => el("rect", { x, y, width: w, height: h, rx: r, fill: WHITE, "fill-opacity": 0 }, g);
  const clip = (p, a) => { const id = nid("clip"), c = el("clipPath", { id }, p); return { id, r: el("rect", a, c) }; };

  const SC = {};

  /* ---- 1. a blue tool roll unrolls; a card rises from each yellow pocket ---- */
  SC.toolroll = {
    dur: 9, still: 9,
    build(svg, api) {
      const PX = 40, PW = 720, PY = 112, PH = 388, SY = 94;
      const NAME = ["Hunt", "Enterprise platform", "Reporting and validation", "Recon and OSINT", "Methodology and mindset"];
      const LINES = [["Hunt"], ["Enterprise", "platform"], ["Reporting", "and", "validation"], ["Recon and", "OSINT"], ["Methodology", "and mindset"]];
      const NUM = ["58", "10", "7", "5", "5"];
      const W = 124, GAP = 15, X0 = 60, PT = 290, PB = 482, UP = 196, DOWN = 306;
      const cp = clip(svg, { x: 0, y: 0, width: 0, height: 600 });
      const roll = el("g", { "clip-path": `url(#${cp.id})` }, svg);
      el("rect", { x: PX + 8, y: PY + 8, width: PW, height: PH, rx: 20, fill: LIL }, roll);
      el("rect", { x: PX, y: PY, width: PW, height: PH, rx: 20, fill: BLUE, stroke: INK, "stroke-width": 3 }, roll);
      el("rect", { x: PX, y: SY, width: PW, height: 36, rx: 12, fill: BLUE, stroke: INK, "stroke-width": 3 }, roll);
      el("path", { d: `M${PX + 18} ${SY + 18} H${PX + PW - 18}`, stroke: SOFT, "stroke-width": 2.5, "stroke-dasharray": "10 9", "stroke-linecap": "round" }, roll);
      const hit = NAME.map(() => -1e9);
      let sel = -1;
      const pk = NAME.map((nm, i) => {
        const x = X0 + i * (W + GAP), cx = x + W / 2, g = el("g", {}, roll);
        hitbox(g, x - 6, UP - 12, W + 12, PB - UP + 18, 18);
        ring(g, x - 6, UP - 12, W + 12, PB - UP + 18, 18);
        const card = el("g", {}, g);
        el("rect", { x: cx - 42, y: 6, width: 96, height: 150, rx: 12, fill: LIL }, card);
        el("rect", { x: cx - 48, y: 0, width: 96, height: 150, rx: 12, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, card);
        mono(card, cx, 60, NUM[i], { "text-anchor": "middle", "font-size": 38 });
        el("rect", { x: cx - 20, y: 74, width: 40, height: 7, rx: 3.5, fill: LIL }, card);
        el("rect", { x, y: PT, width: W, height: PB - PT, rx: 14, fill: YEL, stroke: INK, "stroke-width": 3 }, g);
        el("path", { d: `M${x + 12} ${PT + 14} H${x + W - 12}`, stroke: INK, "stroke-width": 2, "stroke-dasharray": "5 6", "stroke-linecap": "round" }, g);
        const n = LINES[i].length;
        const labs = LINES[i].map((s, j) => { const y = 398 + (j - (n - 1) / 2) * 24; return { n: mono(g, cx, y, s, { "text-anchor": "middle", "font-size": 16 }), y }; });
        button(g, `${nm}: ${NUM[i]}. Lift the card again`, () => { hit[i] = api.now(); sel = i; api.hit(); });
        return { card, labs, xr: x + W };
      });
      const cyl = el("g", {}, svg);
      const cb = el("rect", { y: 84, height: 432, fill: BLUE, stroke: INK, "stroke-width": 3 }, cyl);
      const cc = el("rect", { y: 104, height: 392, fill: "none", stroke: SOFT, "stroke-width": 2.5 }, cyl);
      const cs = el("rect", { y: SY - 2, height: 40, rx: 10, fill: BLUE, stroke: INK, "stroke-width": 3 }, cyl);
      const TAG = "M328 86 H496 Q508 86 508 98 V138 Q508 150 496 150 H328 L304 126 V110 Z";
      const tag = el("g", {}, svg);
      el("path", { d: TAG, fill: SOFT, transform: "translate(6 6)" }, tag);
      el("path", { d: TAG, fill: LIL, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, tag);
      el("circle", { cx: 324, cy: 118, r: 6, fill: WHITE, stroke: INK, "stroke-width": 2.5 }, tag);
      txt(tag, 416, 129, "85 skills", { "text-anchor": "middle", "font-size": 30, "font-weight": 700 });
      const K = (t) => io(seg(t, 0.6, 2.8));
      const when = pk.map((p) => { for (let t = 0; t < 4; t += 0.01) if (PX + PW * K(t) >= p.xr - 20) return t; return 3; });
      return (t, now) => {
        const k = K(t), xe = PX + PW * k;
        cp.r.setAttribute("width", t >= 0.55 ? xe + 10 * k * k * k : 0);
        const w = 66 * (1 - k), pop = ob(seg(t, 0, 0.5));
        if (w < 3 || pop <= 0) cyl.setAttribute("opacity", 0);
        else {
          cyl.setAttribute("opacity", 1);
          cyl.setAttribute("transform", about(xe, 300, pop));
          cb.setAttribute("x", xe - w / 2); cb.setAttribute("width", w); cb.setAttribute("rx", w / 2);
          cc.setAttribute("x", xe - w * 0.22); cc.setAttribute("width", w * 0.44); cc.setAttribute("rx", w * 0.22);
          cs.setAttribute("x", xe - w / 2 - 6); cs.setAttribute("width", w + 12);
        }
        pk.forEach((p, i) => {
          p.labs.forEach((l, j) => { const a = oc(seg(t, when[i] + 0.05 + j * 0.08, when[i] + 0.45 + j * 0.08)); l.n.setAttribute("opacity", a); l.n.setAttribute("y", l.y + 14 * (1 - a)); });
          const s0 = 3.0 + i * 0.45, s = now - hit[i];
          let y = lerp(DOWN, UP, ob(seg(t, s0, s0 + 0.65)));
          if (api.calm) { if (sel === i) y -= 14; }
          else if (s >= 0 && s < 0.95) y = s < 0.25 ? lerp(UP, DOWN, io(s / 0.25)) : lerp(DOWN, UP, ob(seg(s, 0.25, 0.9)));
          tf(p.card, 0, y);
        });
        const tk = ob(seg(t, 5.5, 6.2));
        tag.setAttribute("opacity", seg(t, 5.5, 5.62));
        tag.setAttribute("transform", `translate(0 ${-80 * (1 - tk)}) rotate(${-8 * (1 - tk)} 324 118)`);
      };
    },
  };

  /* ---- 2. report cards slide into a yellow tray and drop into three blue folders ---- */
  SC.filingtray = {
    dur: 9, still: 9,
    build(stage, api) {
      const svg = el("g", { transform: "translate(400 300) scale(1.08) translate(-400 -330)" }, stage);
      const CX = [240, 400, 560], LAB = ["XSS", "SSRF", "IDOR"], HOLD = 3.2;
      const trayB = el("g", {}, svg);
      el("rect", { x: 150, y: 336, width: 500, height: 170, rx: 12, fill: YEL, stroke: INK, "stroke-width": 3 }, trayB);
      const cp = clip(svg, { x: 0, y: 0, width: 800, height: 502 });
      const fl = el("g", { "clip-path": `url(#${cp.id})` }, svg);
      const folders = CX.map((cx, f) => {
        const g = el("g", {}, fl), x0 = cx - 70;
        el("rect", { x: x0, y: 232, width: 140, height: 238, rx: 8, fill: BLUE, stroke: INK, "stroke-width": 3 }, g);
        const cards = el("g", {}, g);
        const TAB = `M${cx - 48} 233 V206 Q${cx - 48} 196 ${cx - 38} 196 H${cx + 38} Q${cx + 48} 196 ${cx + 48} 206 V233`;
        el("path", { d: `${TAB} V235 H${cx - 48} Z`, fill: BLUE }, g);
        el("path", { d: TAB, fill: "none", stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, g);
        mono(g, cx, 223, LAB[f], { "text-anchor": "middle", "font-size": 22 });
        const front = el("rect", { x: x0, y: 300, width: 140, height: 170, rx: 8, fill: BLUE, stroke: INK, "stroke-width": 3, "vector-effect": "non-scaling-stroke" }, g);
        return { g, cards, front, cx, at: -1e9, open: false, k: 0 };
      });
      const mkCard = (p) => {
        const c = el("g", {}, p);
        el("rect", { x: 6, y: 6, width: 104, height: 70, rx: 9, fill: LIL }, c);
        el("rect", { width: 104, height: 70, rx: 9, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, c);
        el("rect", { x: 14, y: 14, width: 56, height: 8, rx: 4, fill: LIL }, c);
        el("rect", { x: 14, y: 30, width: 76, height: 8, rx: 4, fill: BLUE }, c);
        el("rect", { x: 14, y: 46, width: 40, height: 8, rx: 4, fill: LIL }, c);
        return c;
      };
      const cards = Array.from({ length: 6 }, (_, n) => { const f = n % 3, j = Math.floor(n / 3), F = folders[f]; return { n: mkCard(F.cards), f, j, s: 0.9 + n * 0.72, x: F.cx - 52 + (j ? 10 : -8), y: 260 + j * 12 }; });
      const trayF = el("g", {}, svg);
      el("rect", { x: 138, y: 408, width: 540, height: 124, rx: 14, fill: LIL }, trayF);
      el("rect", { x: 130, y: 400, width: 540, height: 124, rx: 14, fill: YEL, stroke: INK, "stroke-width": 3 }, trayF);
      el("rect", { x: 156, y: 424, width: 314, height: 76, rx: 14, fill: LIL, stroke: INK, "stroke-width": 2.5 }, trayF);
      const ccp = clip(svg, { x: 156, y: 424, width: 314, height: 76 });
      const cg = el("g", { "clip-path": `url(#${ccp.id})` }, trayF);
      const digs = ["6", "8", "1"].map((d, i) => mono(cg, 180 + i * 24, 477, d, { "font-size": 40 }));
      const rp = mono(cg, 264, 470, "report patterns", { "font-size": 18 });
      const TP = "M512 430 H636 Q648 430 648 442 V482 Q648 494 636 494 H512 L490 472 V452 Z";
      const tag = el("g", {}, svg);
      el("path", { d: TP, fill: SOFT, transform: "translate(5 5)" }, tag);
      el("path", { d: TP, fill: SKY, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, tag);
      el("circle", { cx: 508, cy: 462, r: 6, fill: WHITE, stroke: INK, "stroke-width": 2.5 }, tag);
      mono(tag, 580, 469, "24 classes", { "text-anchor": "middle", "font-size": 20 });
      const openK = (F, now) => { if (api.calm) return F.open ? 1 : 0; const s = now - F.at; return s < 0 ? 0 : oc(seg(s, 0, 0.5)) * (1 - io(seg(s, HOLD, HOLD + 0.4))); };
      const isOpen = (F, now) => (api.calm ? F.open : now - F.at < HOLD);
      const toggle = (f) => {
        const now = api.now();
        folders.forEach((F, i) => {
          const o = isOpen(F, now);
          if (api.calm) F.open = i === f ? !o : false;
          else if (i === f) F.at = o ? now - HOLD : now;
          else if (o) F.at = now - HOLD;
        });
        fl.appendChild(folders[f].g);
        api.hit();
      };
      const btns = el("g", {}, svg);
      folders.forEach((F, f) => {
        const g = el("g", {}, btns);
        hitbox(g, F.cx - 76, 186, 152, 222, 16);
        ring(g, F.cx - 76, 186, 152, 222, 16);
        button(g, `${LAB[f]} folder: open it and see its cards`, () => toggle(f));
      });
      return (t, now) => {
        const T = about(400, 524, ob(seg(t, 0, 0.55)));
        trayB.setAttribute("transform", T); trayF.setAttribute("transform", T);
        folders.forEach((F, f) => {
          F.k = openK(F, now);
          tf(F.g, 0, 170 * (1 - ob(seg(t, 0.35 + f * 0.1, 0.85 + f * 0.1))));
          F.front.setAttribute("transform", about(0, 470, 1, 1 - 0.32 * F.k));
        });
        cards.forEach((c) => {
          const k1 = oc(seg(t, c.s, c.s + 0.55)), k2 = seg(t, c.s + 0.6, c.s + 1.0), k = folders[c.f].k;
          let x = lerp(860, c.x, k1), y = lerp(112, c.y, ob(k2)), r = -6 * (1 - k1);
          if (k2 >= 1 && k > 0) { x += (c.j ? 30 : -30) * k; y -= 160 * k; r = (c.j ? 7 : -7) * k; }
          c.n.setAttribute("transform", `translate(${x} ${y}) rotate(${r} 52 35)`);
        });
        digs.forEach((d, i) => { const a = ob(seg(t, 5.6 + i * 0.09, 6.0 + i * 0.09)); d.setAttribute("transform", `translate(0 ${56 * (1 - a)})`); });
        const rk = oc(seg(t, 5.9, 6.3));
        rp.setAttribute("opacity", rk); rp.setAttribute("transform", `translate(${-20 * (1 - rk)} 0)`);
        const tk = ob(seg(t, 6.3, 6.9));
        tag.setAttribute("opacity", seg(t, 6.3, 6.42));
        tag.setAttribute("transform", `translate(0 ${-70 * (1 - tk)}) rotate(${12 * (1 - tk)} 508 462)`);
      };
    },
  };

  /* ---- 3. a permit card leaves the wallet, gets stamped, and the gate opens ---- */
  SC.permitcard = {
    dur: 9, still: 9,
    build(svg, api) {
      const gate = el("g", {}, svg);
      const posts = [120, 654].map((x) => {
        const p = el("rect", { x, width: 26, rx: 6, fill: LIL, stroke: INK, "stroke-width": 3 }, gate);
        const c = el("circle", { cx: x + 13, r: 16, fill: LIL, stroke: INK, "stroke-width": 3 }, gate);
        return { p, c };
      });
      const leaves = [[146, 1], [654, -1]].map(([hx, dir]) => {
        const g = el("g", {}, gate);
        const pickets = Array.from({ length: 5 }, () => el("rect", { width: 24, rx: 12, fill: LIL, stroke: INK, "stroke-width": 2.5 }, g));
        const rails = [150, 398].map((y) => el("rect", { y, height: 16, rx: 6, fill: LIL, stroke: INK, "stroke-width": 2.5 }, g));
        return { hx, dir, pickets, rails };
      });
      const wb = el("g", {}, svg);
      el("rect", { x: 188, y: 438, width: 440, height: 126, rx: 18, fill: LIL }, wb);
      el("rect", { x: 180, y: 430, width: 440, height: 126, rx: 18, fill: BLUE, stroke: INK, "stroke-width": 3 }, wb);
      const cp = clip(svg, { x: 0, y: 0, width: 800, height: 556 });
      const cwrap = el("g", { "clip-path": `url(#${cp.id})` }, svg);
      const card = el("g", {}, cwrap);
      el("rect", { x: 208, y: 204, width: 400, height: 220, rx: 18, fill: LIL }, card);
      el("rect", { x: 200, y: 196, width: 400, height: 220, rx: 18, fill: SOFT, stroke: INK, "stroke-width": 3 }, card);
      [[228, 120], [254, 90], [280, 110]].forEach(([y, w]) => el("rect", { x: 226, y, width: w, height: 14, rx: 7, fill: LIL }, card));
      el("path", { d: "M226 322 H574", stroke: LIL, "stroke-width": 2.5, "stroke-dasharray": "7 7", "stroke-linecap": "round" }, card);
      el("circle", { cx: 246, cy: 366, r: 20, fill: WHITE, stroke: INK, "stroke-width": 2.5 }, card);
      const chk = el("g", {}, card);
      el("circle", { cx: 246, cy: 366, r: 20, fill: MINT, stroke: INK, "stroke-width": 2.5 }, chk);
      const ck = el("path", { d: "M236 366 L243 373 L257 358", fill: "none", stroke: INK, "stroke-width": 4, "stroke-linecap": "round", "stroke-linejoin": "round", "stroke-dasharray": 32, "stroke-dashoffset": 32 }, chk);
      mono(card, 278, 373, "Written authorization", { "font-size": 21 });
      const imp = el("g", {}, card);
      el("rect", { x: -95, y: -34, width: 190, height: 68, rx: 10, fill: YEL, stroke: INK, "stroke-width": 3 }, imp);
      el("rect", { x: -87, y: -26, width: 174, height: 52, rx: 6, fill: "none", stroke: INK, "stroke-width": 2, "stroke-dasharray": "6 5" }, imp);
      txt(imp, 0, 11, "In scope", { "text-anchor": "middle", "font-size": 32, "font-weight": 700 });
      ring(card, 188, 184, 424, 244, 26);
      let at = -1e9, pressed = false;
      button(card, "Permit card: stamp it again", () => { at = api.now(); pressed = !pressed; api.hit(); });
      const wf = el("g", {}, svg);
      el("path", { d: "M198 458 H330 Q400 504 470 458 H602 Q620 458 620 476 V538 Q620 556 602 556 H198 Q180 556 180 538 V476 Q180 458 198 458 Z", fill: BLUE, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, wf);
      el("rect", { x: 196, y: 496, width: 408, height: 46, rx: 10, fill: "none", stroke: SOFT, "stroke-width": 2.5, "stroke-dasharray": "9 8" }, wf);
      const stamp = el("g", { "pointer-events": "none" }, svg);
      el("rect", { x: -18, y: -94, width: 36, height: 40, rx: 6, fill: YEL, stroke: INK, "stroke-width": 3 }, stamp);
      el("ellipse", { cx: 0, cy: -114, rx: 42, ry: 24, fill: YEL, stroke: INK, "stroke-width": 3 }, stamp);
      el("rect", { x: -86, y: -58, width: 172, height: 34, rx: 10, fill: YEL, stroke: INK, "stroke-width": 3 }, stamp);
      el("rect", { x: -100, y: -26, width: 200, height: 26, rx: 6, fill: YEL, stroke: INK, "stroke-width": 3 }, stamp);
      const PARK = 172, PRESS = 298, LAND = 3.58;
      return (t, now) => {
        posts.forEach(({ p, c }, i) => {
          const h = 456 * Math.max(0, ob(seg(t, i * 0.08, 0.5 + i * 0.08)));
          p.setAttribute("y", 556 - h); p.setAttribute("height", h);
          c.setAttribute("cy", 552 - h); c.setAttribute("opacity", h > 20 ? 1 : 0);
        });
        const s = now - at, re = !api.calm && s >= 0 && s < 1.7, hold = api.calm && pressed;
        let open = io(seg(t, 4.4, 5.6));
        if (re) open *= cl(1 - io(seg(s, 0, 0.3)) + io(seg(s, 0.6, 1.6)));
        if (hold) open = 0;
        const sx = 1 - 0.66 * open;
        leaves.forEach((L) => {
          L.pickets.forEach((n, j) => {
            const w = 24 * sx, mid = L.hx + L.dir * (26 + j * 48) * sx, h = 330 * (1 + 0.1 * open * (j + 1) / 5), b = 281 + h / 2;
            const v = h * Math.max(0, ob(seg(t, 0.15 + j * 0.09, 0.6 + j * 0.09)));
            n.setAttribute("x", mid - w / 2); n.setAttribute("width", w); n.setAttribute("y", b - v); n.setAttribute("height", v);
          });
          L.rails.forEach((n, j) => {
            const w = 254 * sx * oc(seg(t, 0.6 + j * 0.08, 1.05 + j * 0.08));
            n.setAttribute("x", L.dir > 0 ? L.hx : L.hx - w); n.setAttribute("width", w);
          });
        });
        const WT = about(400, 556, ob(seg(t, 0.45, 0.95)));
        wb.setAttribute("transform", WT); wf.setAttribute("transform", WT);
        card.setAttribute("opacity", t < 0.95 ? 0 : 1);
        tf(card, 0, lerp(272, 0, ob(seg(t, 1.0, 2.2), 1.1)));
        imp.setAttribute("opacity", t >= LAND ? 1 : 0);
        const ip = re ? (s < 0.22 ? 1 : lerp(1.12, 1, ob(seg(s, 0.22, 0.52)))) : lerp(1.2, 1, ob(seg(t, LAND, LAND + 0.32)));
        imp.setAttribute("transform", `translate(470 262) rotate(-7) scale(${ip})`);
        const e = io(seg(t, 2.4, 3.2));
        let x = lerp(590, 470, e), y = lerp(-30, PARK, e), r = lerp(14, 0, e);
        const d = seg(t, 3.32, LAND);
        if (d > 0) { y = lerp(PARK, PRESS, d * d * d); r = lerp(0, -7, d); }
        if (t >= LAND) { const u = oc(seg(t, 3.8, 4.4)); y = lerp(PRESS, PARK, u); r = lerp(-7, 0, u); }
        let sq = 1 - 0.08 * Math.sin(Math.PI * seg(t, LAND, LAND + 0.2));
        if (re) {
          if (s < 0.22) { const q = seg(s, 0, 0.22); y = lerp(PARK, PRESS, q * q * q); r = lerp(0, -7, q); }
          else { const q = oc(seg(s, 0.42, 1.0)); y = lerp(PRESS, PARK, q); r = lerp(-7, 0, q); }
          sq = 1 - 0.08 * Math.sin(Math.PI * seg(s, 0.22, 0.42));
        }
        if (hold) { y = PRESS; r = -7; }
        stamp.setAttribute("transform", `translate(${x} ${y}) rotate(${r}) scale(1 ${sq})`);
        chk.setAttribute("transform", about(246, 366, ob(seg(t, 5.6, 6.0))));
        ck.setAttribute("stroke-dashoffset", 32 * (1 - seg(t, 5.75, 6.1)));
      };
    },
  };

  /* ---- title card, 16 by 9 ---- */
  SC.hero = {
    w: 800, h: 450, dur: 6, still: 6,
    build(svg) {
      const chip = el("g", {}, svg);
      el("rect", { x: 48, y: 84, width: 140, height: 38, rx: 19, fill: SKY, stroke: INK, "stroke-width": 2.5 }, chip);
      mono(chip, 118, 109, "Concepts", { "text-anchor": "middle", "font-size": 18 });
      const t1 = txt(svg, 48, 190, "What is", { "font-size": 48, "font-weight": 700 });
      const t2 = txt(svg, 48, 248, "Claude-BugHunter?", { "font-size": 48, "font-weight": 700 });
      const bar = el("path", { d: "M50 276 H290", stroke: YEL, "stroke-width": 12, "stroke-linecap": "round", "stroke-dasharray": 260, "stroke-dashoffset": 260 }, svg);
      const sub = txt(svg, 48, 318, "A Claude Code skill bundle for bug hunting", { "font-size": 21, "font-weight": 500 });
      const date = mono(svg, 48, 352, "Checked 27 Nov 2026", { "font-size": 15, "font-weight": 500, fill: MUTE });
      const roll = el("g", {}, svg);
      el("rect", { x: 613, y: 81, width: 124, height: 50, rx: 8, fill: LIL }, roll);
      el("rect", { x: 608, y: 76, width: 124, height: 50, rx: 8, fill: YEL, stroke: INK, "stroke-width": 2.5 }, roll);
      [0, 1, 2].forEach((i) => el("rect", { x: 624 + i * 34, y: 88, width: 20, height: 20, rx: 3, fill: SOFT, stroke: INK, "stroke-width": 2 }, roll));
      [0, 1, 2].forEach((i) => el("rect", { x: 620 + i * 34, y: 98, width: 28, height: 22, rx: 4, fill: YEL, stroke: INK, "stroke-width": 2 }, roll));
      el("rect", { x: 602, y: 68, width: 136, height: 14, rx: 6, fill: YEL, stroke: INK, "stroke-width": 2.5 }, roll);
      el("rect", { x: 724, y: 62, width: 24, height: 74, rx: 12, fill: YEL, stroke: INK, "stroke-width": 2.5 }, roll);
      const c1 = el("g", {}, svg);
      el("rect", { x: 582, y: 154, width: 200, height: 58, rx: 14, fill: SOFT }, c1);
      el("rect", { x: 576, y: 148, width: 200, height: 58, rx: 14, fill: LIL, stroke: INK, "stroke-width": 2.5 }, c1);
      mono(c1, 676, 186, "85 skills", { "text-anchor": "middle", "font-size": 26 });
      const permit = el("g", {}, svg);
      el("rect", { x: 633, y: 241, width: 96, height: 62, rx: 9, fill: LIL }, permit);
      el("rect", { x: 628, y: 236, width: 96, height: 62, rx: 9, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, permit);
      el("rect", { x: 640, y: 250, width: 46, height: 8, rx: 4, fill: LIL }, permit);
      el("rect", { x: 640, y: 264, width: 62, height: 8, rx: 4, fill: LIL }, permit);
      el("circle", { cx: 708, cy: 284, r: 8, fill: MINT, stroke: INK, "stroke-width": 2 }, permit);
      const c2 = el("g", {}, svg);
      el("rect", { x: 582, y: 320, width: 200, height: 86, rx: 14, fill: SOFT }, c2);
      el("rect", { x: 576, y: 314, width: 200, height: 86, rx: 14, fill: MINT, stroke: INK, "stroke-width": 2.5 }, c2);
      mono(c2, 676, 350, "Written", { "text-anchor": "middle", "font-size": 22 });
      mono(c2, 676, 380, "authorization", { "text-anchor": "middle", "font-size": 22 });
      const ups = [[t1, 0.25], [t2, 0.36], [sub, 0.8], [date, 0.92]];
      const pops = [[chip, 0.1, 118, 103], [roll, 1.2, 676, 100], [c1, 1.42, 676, 177], [permit, 1.64, 676, 267], [c2, 1.86, 676, 357]];
      return (t) => {
        ups.forEach(([n, a]) => { const k = oc(seg(t, a, a + 0.5)); n.setAttribute("opacity", k); n.setAttribute("transform", `translate(0 ${24 * (1 - k)})`); });
        pops.forEach(([n, a, x, y]) => n.setAttribute("transform", about(x, y, ob(seg(t, a, a + 0.5)))));
        bar.setAttribute("stroke-dashoffset", 260 * (1 - io(seg(t, 0.7, 1.2))));
      };
    },
  };

  /* ---- player ---- */
  const q = new URLSearchParams(location.search), frozen = q.has("mgstill"), fixed = parseFloat(q.get("mgstill"));
  const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const FADE = 0.9, PIN = 4.5;
  const mount = (fig) => {
    const sc = SC[fig.dataset.scene], img = fig.querySelector("img"); if (!sc || !img) return;
    const W = sc.w || 800, H = sc.h || 600;
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, class: "mg-svg", role: "group", "aria-label": img.alt || "" });
    svg.style.aspectRatio = `${W} / ${H}`;
    el("rect", { width: W, height: H, fill: "#fff" }, svg);
    const stage = el("g", {}, svg);
    img.replaceWith(svg);
    let off = 0, raf = 0, seen = false, started = false, pin = -1;
    const base = performance.now(), clock = () => (performance.now() - base) / 1000, period = sc.dur + FADE;
    let draw = () => {};
    const frame = () => {
      const now = clock();
      if (calm || now < pin) { stage.setAttribute("opacity", 1); draw(sc.still, now); return; }
      const u = (((now + off) % period) + period) % period;
      stage.setAttribute("opacity", u <= sc.dur ? 1 : 1 - io(seg(u, sc.dur, period)));
      draw(Math.min(u, sc.dur), now);
    };
    const tick = () => { cancelAnimationFrame(raf); frame(); if (seen && !calm) raf = requestAnimationFrame(tick); };
    const api = { now: clock, calm, hit: () => { if (!calm) { pin = clock() + PIN; off = sc.dur - pin; } tick(); } };
    draw = sc.build(stage, api);
    if (frozen) { draw(isNaN(fixed) ? sc.still : fixed, 0); return; }
    new IntersectionObserver(([e]) => {
      seen = e.isIntersecting;
      if (seen) {
        if (!started) { started = true; off = -clock(); }
        tick();
        if (!fig.dataset.sent && window.posthog) { fig.dataset.sent = 1; window.posthog.capture("blog_scene_view", { slug: location.pathname.split("/").filter(Boolean).pop(), scene: fig.dataset.scene }); }
      }
      else cancelAnimationFrame(raf);
    }, { threshold: 0.25 }).observe(fig);
    svg.addEventListener("click", () => { if (!fig.dataset.hit && window.posthog) { fig.dataset.hit = 1; window.posthog.capture("blog_scene_interact", { slug: location.pathname.split("/").filter(Boolean).pop(), scene: fig.dataset.scene }); } });
    frame();
  };
  const go = () => document.querySelectorAll("figure.mg[data-scene]").forEach(mount);
  const fonts = document.fonts && document.fonts.load ? Promise.all([document.fonts.load('700 32px "Space Grotesk"'), document.fonts.load('500 20px "Space Grotesk"'), document.fonts.load('700 20px "JetBrains Mono"'), document.fonts.load('500 16px "JetBrains Mono"')]).catch(() => {}) : Promise.resolve();
  const start = () => fonts.then(go, go);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
