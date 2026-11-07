/* Bright coded scenes for "Perplexity Teammates vs Munder Difflin". Vanilla JS, no library.
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

  const SC = {};

  /* ---- 1. a sprinkler waters four team squares in turn, on its own clock ---- */
  SC.sprinkler = {
    dur: 12, still: 12,
    build(svg, api) {
      const card = el("g", {}, svg);
      el("rect", { x: 170, y: 34, width: 460, height: 64, rx: 18, fill: YEL, stroke: INK, "stroke-width": 3 }, card);
      txt(card, 400, 76, "Follows up as things change", { "text-anchor": "middle", "font-size": 27, "font-weight": 700 });
      const H = [400, 352];
      const SQ = [["Marketing", 150, 230, -3], ["Sales", 650, 230, 3], ["Support", 650, 470, -2], ["Operations", 150, 470, 2]];
      el("ellipse", { cx: 400, cy: 548, rx: 70, ry: 12, fill: MINT, stroke: INK, "stroke-width": 2.5 }, svg);
      const squares = SQ.map(([s, x, y, r]) => {
        const g = el("g", {}, svg);
        el("rect", { x: -95, y: -60, width: 190, height: 120, rx: 8, fill: "#fff", stroke: INK, "stroke-width": 3 }, g);
        const wet = el("rect", { x: -95, y: -60, width: 190, height: 120, rx: 8, fill: SKY, opacity: 0 }, g);
        el("path", { d: "M70 -60 L95 -35", stroke: INK, "stroke-width": 2, fill: "none" }, g);
        el("path", { d: "M70 -60 V-35 H95", fill: SOFT, stroke: INK, "stroke-width": 2, "stroke-linejoin": "round" }, g);
        const ripple = el("ellipse", { cx: 0, cy: -26, rx: 10, ry: 6, fill: "none", stroke: BLUE, "stroke-width": 2.5, opacity: 0 }, g);
        txt(g, 0, 9, s, { "text-anchor": "middle", "font-size": 26, "font-weight": 700 });
        tf(g, x, y, 1, r);
        return { g, wet, ripple, x, y, a: (Math.atan2(y - H[1], x - H[0]) * 180) / Math.PI };
      });
      const ang = [-90, squares[0].a, squares[1].a, squares[2].a, squares[3].a, 270];
      const S0 = 1.6, GAP = 2;
      const clock = el("g", {}, svg);
      el("circle", { r: 27, fill: "#fff", stroke: INK, "stroke-width": 3 }, clock);
      for (let i = 0; i < 12; i++) { const a = (i * 30 * Math.PI) / 180; el("path", { d: `M${Math.cos(a) * 20} ${Math.sin(a) * 20} L${Math.cos(a) * 23} ${Math.sin(a) * 23}`, stroke: INK, "stroke-width": 2, "stroke-linecap": "round" }, clock); }
      const hand = el("path", { d: "M0 0 V-17", stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, clock);
      el("path", { d: "M0 0 H11", stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, clock);
      el("circle", { r: 3.5, fill: YEL, stroke: INK, "stroke-width": 1.5 }, clock);
      el("path", { d: "M-8 -31 H8", stroke: INK, "stroke-width": 4, "stroke-linecap": "round" }, clock);
      const drops = [];
      const spr = el("g", {}, svg);
      el("rect", { x: 352, y: 300, width: 96, height: 260, rx: 24, fill: "#fff", "fill-opacity": 0, class: "mg-ring", stroke: INK, "stroke-width": 2, "stroke-dasharray": "3 7" }, spr);
      el("rect", { x: 394, y: H[1], width: 12, height: 192, rx: 4, fill: BLUE, stroke: INK, "stroke-width": 2.5 }, spr);
      for (let j = 0; j < 10; j++) drops.push(el("circle", { r: 6 - (j % 3), fill: SKY, stroke: INK, "stroke-width": 1.5, opacity: 0 }, svg));
      const arm = el("g", {}, spr);
      el("rect", { x: 0, y: -6, width: 46, height: 12, rx: 6, fill: LIL, stroke: INK, "stroke-width": 2.5 }, arm);
      el("circle", { cx: 46, cy: 0, r: 7, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, arm);
      const head = el("circle", { cx: H[0], cy: H[1], r: 20, fill: YEL, stroke: INK, "stroke-width": 3 }, spr);
      const light = el("circle", { cx: H[0], cy: H[1], r: 7, fill: SOFT, stroke: INK, "stroke-width": 2 }, spr);
      tf(clock, 500, 412);
      button(spr, "Sprinkler: sweep again", () => api.seek(S0 - 0.6));
      return (t) => {
        const tick = Math.floor(t * 2), tk = ob(seg(t * 2 - tick, 0, 0.35));
        hand.setAttribute("transform", `rotate(${(tick - 1 + tk) * 30})`);
        let bump = 0;
        for (let i = 0; i < 4; i++) bump = Math.max(bump, Math.sin(seg(t, S0 + i * GAP - 0.35, S0 + i * GAP) * Math.PI));
        tf(clock, 500, 412, 1 + 0.14 * bump);
        let a = ang[0];
        for (let i = 0; i < 5; i++) { const s = i < 4 ? S0 + i * GAP : S0 + 4 * GAP + 0.3; if (t >= s) a = ang[i] + (ang[i + 1] - ang[i]) * io(seg(t, s, s + 0.45)); }
        arm.setAttribute("transform", `translate(${H[0]} ${H[1]}) rotate(${a})`);
        const on = t >= S0 - 0.1 && t < S0 + 4 * GAP + 0.2;
        light.setAttribute("fill", on ? MINT : SOFT);
        head.setAttribute("r", 20 + 3 * Math.sin(seg(t, S0 - 0.3, S0 + 0.1) * Math.PI));
        const k = Math.floor((t - S0) / GAP), u = t - S0 - k * GAP - 0.5;
        drops.forEach((d) => d.setAttribute("opacity", 0));
        squares.forEach((q, i) => {
          const w = t < S0 + i * GAP + 0.9 ? 0 : oc(seg(t, S0 + i * GAP + 0.9, S0 + i * GAP + 1.8));
          q.wet.setAttribute("opacity", 0.6 * w);
          const r = seg(t - (S0 + i * GAP + 0.9), 0, 1.2) % 1, rv = t > S0 + i * GAP + 0.9 && t < S0 + i * GAP + 2.1;
          q.ripple.setAttribute("rx", 10 + 60 * r); q.ripple.setAttribute("ry", 6 + 30 * r); q.ripple.setAttribute("opacity", rv ? 1 - r : 0);
        });
        if (k >= 0 && k < 4 && u >= 0) {
          const q = squares[k], rad = (ang[k + 1] * Math.PI) / 180, sx = H[0] + Math.cos(rad) * 52, sy = H[1] + Math.sin(rad) * 52;
          const ty = q.y - 26, cx = (sx + q.x) / 2, cy = Math.min(sy, ty) - 130;
          drops.forEach((d, j) => {
            const m = Math.floor(u * 1.6 - j / 10), e = (j / 10 + m) / 1.6, p = (u - e) * 1.6;
            if (e < 0 || e > 0.9 || p < 0 || p >= 1) return;
            const x = (1 - p) * (1 - p) * sx + 2 * (1 - p) * p * cx + p * p * q.x, y = (1 - p) * (1 - p) * sy + 2 * (1 - p) * p * cy + p * p * ty;
            d.setAttribute("cx", x); d.setAttribute("cy", y); d.setAttribute("opacity", 1);
          });
        }
      };
    },
  };

  /* ---- 2. a laptop office: cards move desk to desk while the computer runs ---- */
  SC.laptop = {
    dur: 8, still: 8,
    build(svg, api) {
      const lap = el("g", {}, svg);
      el("rect", { x: 26, y: 96, width: 552, height: 400, rx: 26, fill: "#fff", "fill-opacity": 0, class: "mg-ring", stroke: INK, "stroke-width": 2, "stroke-dasharray": "3 7" }, lap);
      el("rect", { x: 44, y: 112, width: 516, height: 340, rx: 18, fill: "#fff", stroke: INK, "stroke-width": 4 }, lap);
      el("rect", { x: 60, y: 128, width: 484, height: 308, rx: 10, fill: SOFT, stroke: INK, "stroke-width": 2 }, lap);
      txt(lap, 302, 170, "Agents run while your computer runs", { "text-anchor": "middle", "font-size": 22, "font-weight": 700 });
      el("path", { d: "M84 190 H520", stroke: INK, "stroke-width": 2, "stroke-dasharray": "2 8", "stroke-linecap": "round" }, lap);
      el("path", { d: "M24 452 H580 L562 486 H42 Z", fill: SOFT, stroke: INK, "stroke-width": 4, "stroke-linejoin": "round" }, lap);
      el("rect", { x: 262, y: 452, width: 80, height: 10, rx: 5, fill: "#fff", stroke: INK, "stroke-width": 2 }, lap);
      el("path", { d: "M76 398 H528", stroke: INK, "stroke-width": 2, "stroke-linecap": "round" }, lap);
      const DX = [126, 242, 358, 474], TOP = 330;
      const desks = DX.map((x) => {
        el("path", { d: `M${x - 38} ${TOP + 12} V398 M${x + 38} ${TOP + 12} V398`, stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, lap);
        el("rect", { x: x - 30, y: TOP + 30, width: 22, height: 26, rx: 3, fill: "#fff", stroke: INK, "stroke-width": 2 }, lap);
        return el("rect", { x: x - 48, y: TOP, width: 96, height: 14, rx: 5, fill: BLUE, stroke: INK, "stroke-width": 2.5 }, lap);
      });
      const mkCard = () => {
        const g = el("g", { opacity: 0 }, lap);
        el("rect", { x: -22, y: -16, width: 44, height: 32, rx: 4, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, g);
        el("path", { d: "M-13 -6 H13 M-13 3 H7", stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round" }, g);
        const ok = el("g", { opacity: 0 }, g);
        el("circle", { cx: 20, cy: -14, r: 10, fill: MINT, stroke: INK, "stroke-width": 2 }, ok);
        el("path", { d: "M15 -14 l4 4 l6 -8", stroke: INK, "stroke-width": 2.5, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, ok);
        return { g, ok };
      };
      const HOP = 1.3;
      const place = (c, s, keep) => {
        if (s < 0 || (!keep && s > 7.5)) { c.g.setAttribute("opacity", 0); return -1; }
        let x = DX[0], y = TOP - 18, at = 0;
        for (let h = 0; h < 3; h++) { const a = 0.8 + h * HOP, p = io(seg(s, a, a + 0.6)); if (s >= a) { x = DX[h] + (DX[h + 1] - DX[h]) * p; y = TOP - 18 - 46 * Math.sin(p * Math.PI); at = p >= 1 ? h + 1 : -1; } }
        tf(c.g, x, y, ob(seg(s, 0, 0.4)));
        c.g.setAttribute("opacity", keep ? 1 : 1 - seg(s, 7, 7.5));
        c.ok.setAttribute("opacity", ob(seg(s, 0.8 + 3 * HOP, 1.1 + 3 * HOP)));
        return at;
      };
      const main = mkCard(), extra = [mkCard(), mkCard(), mkCard()];
      const sent = [-99, -99, -99];
      let next = 0;
      const tent = el("g", {}, svg);
      el("path", { d: "M616 330 L624 314 H760 L768 330 Z", fill: SOFT, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, tent);
      el("path", { d: "M600 486 L616 330 H768 L784 486 Z", fill: LIL, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, tent);
      txt(tent, 692, 404, "Cloud Office,", { "text-anchor": "middle", "font-size": 22, "font-weight": 700 });
      txt(tent, 692, 436, "coming soon", { "text-anchor": "middle", "font-size": 22, "font-weight": 700 });
      button(lap, "Laptop: send a new card across the desks", () => { sent[next] = api.now(); next = (next + 1) % 3; api.poke(); });
      return (t, now) => {
        const busy = [0, 0, 0, 0];
        const a = place(main, t - 0.3, true); if (a >= 0) busy[a] = 1;
        extra.forEach((c, i) => { const b = place(c, now - sent[i]); if (b >= 0) busy[b] = 1; });
        desks.forEach((d, i) => d.setAttribute("fill", busy[i] ? YEL : BLUE));
        const k = ob(seg(t, 0.2, 0.8));
        tent.setAttribute("transform", `translate(692 486) scale(1 ${cl(k, 0, 1.2)}) translate(-692 -486)`);
      };
    },
  };

  /* ---- 3. three umbrellas, each keeping its own browser window dry ---- */
  SC.umbrellas = {
    dur: 8, still: 8,
    build(svg, api) {
      const CX = [150, 400, 650], RIM = 228, TOPY = 148, HW = 100, GROUND = 470;
      const names = ["Teammate one", "Teammate two", "Teammate three"], fills = [YEL, BLUE, LIL];
      el("path", { d: `M24 ${GROUND} H776`, stroke: INK, "stroke-width": 2, "stroke-dasharray": "2 10", "stroke-linecap": "round" }, svg);
      const rainG = el("g", {}, svg);
      const fold = [-99, -99, -99];
      const ums = CX.map((cx, i) => {
        el("path", { d: `M${cx} ${RIM} V420 Q${cx} 446 ${cx - 16} 446 Q${cx - 30} 446 ${cx - 30} 430`, stroke: INK, "stroke-width": 5, fill: "none", "stroke-linecap": "round" }, svg);
        const w = el("g", {}, svg);
        el("rect", { x: cx - 74, y: 266, width: 148, height: 114, rx: 10, fill: "#fff", stroke: INK, "stroke-width": 3 }, w);
        el("path", { d: `M${cx - 74} 292 H${cx + 74}`, stroke: INK, "stroke-width": 2.5 }, w);
        [0, 1, 2].forEach((d) => el("circle", { cx: cx - 60 + d * 13, cy: 279, r: 4, fill: "#fff", stroke: INK, "stroke-width": 2 }, w));
        el("rect", { x: cx - 26, y: 272, width: 86, height: 14, rx: 7, fill: SOFT, stroke: INK, "stroke-width": 1.5 }, w);
        el("rect", { x: cx - 60, y: 306, width: 120 - i * 20, height: 10, rx: 5, fill: fills[i] }, w);
        el("rect", { x: cx - 60, y: 326, width: 90, height: 10, rx: 5, fill: SOFT }, w);
        el("rect", { x: cx - 60, y: 346, width: 60 + i * 16, height: 10, rx: 5, fill: SOFT }, w);
        txt(svg, cx, 512, names[i], { "text-anchor": "middle", "font-size": 26, "font-weight": 700 });
        const btn = el("g", {}, svg), can = el("g", {}, btn);
        el("rect", { x: cx - 114, y: 118, width: 228, height: 124, rx: 22, fill: "#fff", "fill-opacity": 0, class: "mg-ring", stroke: INK, "stroke-width": 2, "stroke-dasharray": "3 7" }, btn);
        const s = HW / 3;
        el("path", { d: `M${cx - HW} ${RIM} A${HW} ${RIM - TOPY} 0 0 1 ${cx + HW} ${RIM} Q${cx + 2 * s} ${RIM - 14} ${cx + s} ${RIM} Q${cx} ${RIM - 14} ${cx - s} ${RIM} Q${cx - 2 * s} ${RIM - 14} ${cx - HW} ${RIM} Z`, fill: fills[i], stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, can);
        el("path", { d: `M${cx} ${TOPY} Q${cx - 34} ${TOPY + 30} ${cx - s} ${RIM} M${cx} ${TOPY} V${RIM - 2} M${cx} ${TOPY} Q${cx + 34} ${TOPY + 30} ${cx + s} ${RIM}`, stroke: INK, "stroke-width": 2, fill: "none" }, can);
        el("path", { d: `M${cx} ${TOPY} V${TOPY - 16}`, stroke: INK, "stroke-width": 4, "stroke-linecap": "round" }, btn);
        button(btn, `${names[i]} umbrella: fold it shut and open it again`, () => { fold[i] = api.now(); api.poke(); });
        return { can, cx };
      });
      const spG = el("g", {}, svg);
      const N = 38, drops = Array.from({ length: N }, (_, i) => ({ x: 22 + i * 20, ph: (i * 0.37) % 1, P: i % 3 ? 1 : 2, n: el("path", { d: "M0 0 V14", stroke: SKY, "stroke-width": 3.5, "stroke-linecap": "round" }, rainG), sp: el("ellipse", { rx: 7, ry: 2.5, fill: "none", stroke: SKY, "stroke-width": 2 }, spG) }));
      return (t, now) => {
        const f = fold.map((a) => { const s = now - a; return 1 - 0.86 * (io(seg(s, 0, 0.45)) - io(seg(s, 1.1, 1.6))); });
        ums.forEach((u, i) => u.can.setAttribute("transform", `translate(${u.cx} ${TOPY}) scale(${f[i]} 1) translate(${-u.cx} ${-TOPY})`));
        drops.forEach((d) => {
          let stop = GROUND;
          CX.forEach((cx, i) => { const hw = HW * f[i], dx = Math.abs(d.x - cx); if (dx < hw) stop = RIM - (RIM - TOPY) * Math.sqrt(1 - (dx / hw) ** 2); else if (dx < 74) stop = 266; });
          const p = ((t / d.P + d.ph) % 1), y = -20 + p * (GROUND + 20);
          d.n.setAttribute("transform", `translate(${d.x} ${y - 14})`);
          d.n.setAttribute("opacity", y <= stop ? 1 : 0);
          const over = y > stop && y < stop + 60;
          d.sp.setAttribute("cx", d.x); d.sp.setAttribute("cy", stop); d.sp.setAttribute("opacity", over ? 1 - (y - stop) / 60 : 0);
        });
      };
    },
  };

  /* ---- title card, 16 by 9 ---- */
  SC.hero = {
    w: 960, h: 540, dur: 2, still: 2,
    build(svg) {
      el("rect", { x: 64, y: 44, width: 140, height: 40, rx: 20, fill: YEL, stroke: INK, "stroke-width": 2.5 }, svg);
      txt(svg, 134, 71, "Compared", { "text-anchor": "middle", "font-size": 19, "font-weight": 700 });
      txt(svg, 64, 158, "Perplexity Teammates", { "font-size": 64, "font-weight": 700 });
      txt(svg, 64, 232, "vs Munder Difflin", { "font-size": 64, "font-weight": 700 });
      txt(svg, 64, 286, "Hosted agents or your own computer", { "font-size": 27, "font-weight": 500, fill: MUTE });
      txt(svg, 64, 322, "Checked 7 Nov 2026", { "font-size": 18, "font-weight": 500, fill: MUTE });
      const tile = (x, label, col) => { const g = el("g", {}, svg); el("rect", { x, y: 370, width: 400, height: 112, rx: 20, fill: col, stroke: INK, "stroke-width": 3 }, g); txt(g, x + 200, 436, label, { "text-anchor": "middle", "font-family": MONO, "font-size": 26, "font-weight": 700 }); return g; };
      const a = tile(64, "Perplexity Teammates", SKY), b = tile(496, "Munder Difflin", MINT);
      return (t, now) => {
        const v = Math.max(t, now || 0);
        const ka = oc(seg(v, 0.2, 1.1)), kb = oc(seg(v, 0.5, 1.4));
        a.setAttribute("transform", `translate(${-420 * (1 - ka)} 0)`); a.setAttribute("opacity", ka);
        b.setAttribute("transform", `translate(${420 * (1 - kb)} 0)`); b.setAttribute("opacity", kb);
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
