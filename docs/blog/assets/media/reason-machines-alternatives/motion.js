/* Bright coded scenes for "Reason Machines alternatives". Vanilla JS, no library.
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
  let uid = 0;
  const nid = (p) => `mg-${p}-${++uid}`;
  const ring = (g, a) => el(a.r ? "circle" : "rect", Object.assign({ fill: "#fff", "fill-opacity": 0, class: "mg-ring", stroke: INK, "stroke-width": 2, "stroke-dasharray": "3 7" }, a), g);

  const SC = {};

  /* ---- 1. a washing line on two pulleys carries notes between three windows ---- */
  SC.pulley = {
    dur: 9, still: 9,
    build(svg, api) {
      const WX = [140, 400, 660], WY = 300, LY = 196, PR = 22, PX = [48, 752], DROP = 348;
      const NAMES = ["Claude Code", "Codex", "Cursor"];
      PX.forEach((x) => el("path", { d: `M${x - 16} 96 H${x + 16} M${x} 96 V${LY - PR}`, stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, svg));
      el("path", { d: `M${PX[0]} ${LY - 2 * PR} H${PX[1]} M${PX[0]} ${LY} H${PX[1]}`, stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round" }, svg);
      const wheels = PX.map((x) => {
        const g = el("g", {}, svg);
        el("circle", { r: PR, fill: BLUE, stroke: INK, "stroke-width": 3 }, g);
        const sp = el("path", { d: "M-13 0 H13 M0 -13 V13", stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round" }, g);
        el("circle", { r: 5, fill: "#fff", stroke: INK, "stroke-width": 2 }, g);
        tf(g, x, LY - PR);
        return sp;
      });
      let send = () => {};
      WX.forEach((x, i) => {
        const g = el("g", {}, svg);
        ring(g, { x: -127, y: -12, width: 254, height: 232, rx: 16 });
        el("rect", { x: -115, y: 0, width: 230, height: 160, rx: 8, fill: "#fff", stroke: INK, "stroke-width": 3 }, g);
        el("rect", { x: -103, y: 12, width: 206, height: 136, rx: 4, fill: SOFT, stroke: INK, "stroke-width": 2 }, g);
        el("path", { d: "M0 12 V148 M-103 80 H103", stroke: INK, "stroke-width": 2 }, g);
        el("rect", { x: -125, y: 160, width: 250, height: 12, rx: 4, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, g);
        txt(g, 0, 208, NAMES[i], { "text-anchor": "middle", "font-family": MONO, "font-size": 22, "font-weight": 700 });
        tf(g, x, WY);
        button(g, `${NAMES[i]} window: send a note along the line`, () => send(i));
      });
      const note = (label, w) => {
        const g = el("g", { "pointer-events": "none" }, svg);
        el("path", { d: `M${-w / 2} 8 H${w / 2 - 16} L${w / 2} 24 V62 H${-w / 2} Z`, fill: YEL, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, g);
        el("path", { d: `M${w / 2 - 16} 8 V24 H${w / 2} Z`, fill: "#fff", stroke: INK, "stroke-width": 2, "stroke-linejoin": "round" }, g);
        txt(g, -6, 42, label, { "text-anchor": "middle", "font-size": 19, "font-weight": 600 });
        el("rect", { x: -5, y: -9, width: 10, height: 22, rx: 3, fill: LIL, stroke: INK, "stroke-width": 2 }, g);
        return g;
      };
      const gA = note("Can you check this", 210), gD = note("Done", 96);
      tf(gA, WX[1], DROP, 0.9); tf(gD, WX[0], DROP, 0.9);
      const A = note("Can you check this", 210), D = note("Done", 96);
      const extra = []; let spin = 0;
      send = (i) => { if (extra.length > 3) return; const j = i === 2 ? 1 : i + 1; extra.push({ g: note("Can you check this", 210), a: WX[i], b: WX[j], at: api.now() }); api.poke(); };
      return (t, now) => {
        const g0 = 1 - seg(t, 0, 0.45);
        gA.setAttribute("opacity", g0); gD.setAttribute("opacity", g0);
        const ax = WX[0] + (WX[1] - WX[0]) * io(seg(t, 0.7, 3.0)), ak = oc(seg(t, 3.1, 3.7));
        tf(A, ax, LY + (DROP - LY) * ak, 1 - 0.1 * ak); A.setAttribute("opacity", seg(t, 0.1, 0.5));
        const dp = ob(seg(t, 3.9, 4.3)), dx = WX[1] + (WX[0] - WX[1]) * io(seg(t, 4.5, 6.8)), dk = oc(seg(t, 6.9, 7.5));
        tf(D, dx, LY + (DROP - LY) * dk, (0.4 + 0.6 * dp) * (1 - 0.1 * dk)); D.setAttribute("opacity", cl(dp * 3));
        let trav = (ax - WX[0]) - (WX[1] - dx) + spin;
        for (let k = extra.length - 1; k >= 0; k--) {
          const e = extra[k], s = now - e.at;
          if (s > 3) { spin += e.b - e.a; trav += e.b - e.a; e.g.remove(); extra.splice(k, 1); continue; }
          const x = e.a + (e.b - e.a) * io(seg(s, 0.2, 2.2)), q = oc(seg(s, 2.3, 2.9));
          tf(e.g, x, LY + 70 * q, 1 - 0.2 * q); e.g.setAttribute("opacity", seg(s, 0, 0.2) * (1 - q)); trav += x - e.a;
        }
        const deg = ((trav / PR) * 180) / Math.PI;
        wheels.forEach((w) => w.setAttribute("transform", `rotate(${deg})`));
      };
    },
  };

  /* ---- 2. a paper windmill keeps turning as the next sail takes over ---- */
  SC.windmill = {
    dur: 10, still: 10,
    build(svg, api) {
      const HX = 400, HY = 196, COL = [BLUE, LIL, MINT], NAME = ["Account one", "Account two", "Reason credits"];
      const vA = (t) => 1 - 0.92 * io(seg(t, 2.8, 4.0)) + 0.92 * oc(seg(t, 4.6, 5.6));
      const vU = (s) => 1 - 0.92 * io(seg(s, 0, 0.9)) + 0.92 * oc(seg(s, 1.3, 2.1));
      let raw = 0; const tab = [0];
      for (let i = 1; i <= 1000; i++) { raw += vA((i - 0.5) / 100) / 100; tab.push(raw); }
      const B = (Math.max(1, Math.round((raw * 80) / 360)) * 360) / raw;
      const th = (t) => tab[Math.round(cl(t, 0, 10) * 100)] * B;
      const wind = [[64, 128], [44, 196], [64, 264]].map(([x, y]) => el("path", { d: `M${x} ${y} q40 -14 80 0 t80 0`, stroke: SKY, "stroke-width": 6, fill: "none", "stroke-linecap": "round", "stroke-dasharray": "36 24" }, svg));
      const mill = el("g", {}, svg);
      ring(mill, { cx: HX, cy: HY, r: 176 });
      el("path", { d: `M372 ${HY + 8} L428 ${HY + 8} L454 392 L346 392 Z`, fill: "#fff", stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, mill);
      el("path", { d: "M365 270 H435 M357 330 H443", stroke: INK, "stroke-width": 1.5 }, mill);
      el("path", { d: "M384 392 V364 Q400 344 416 364 V392", fill: SOFT, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, mill);
      el("path", { d: "M290 392 H510", stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, mill);
      const rotor = el("g", {}, mill);
      const sails = COL.map((c, i) => {
        const s = el("g", { transform: `rotate(${i * 120})` }, rotor), a = el("g", {}, s);
        el("path", { d: "M6 -30 H40 Q46 -30 46 -36 V-152 Q46 -158 40 -158 H6 Z", fill: c, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, a);
        el("path", { d: "M6 -68 H46 M6 -106 H46 M26 -30 V-158", stroke: INK, "stroke-width": 1.5 }, a);
        el("path", { d: "M0 -12 V-160", stroke: INK, "stroke-width": 3.5, "stroke-linecap": "round" }, a);
        return a;
      });
      el("circle", { r: 15, fill: "#fff", stroke: INK, "stroke-width": 3 }, rotor);
      el("circle", { r: 5, fill: SOFT, stroke: INK, "stroke-width": 2 }, rotor);
      const cards = NAME.map((n, i) => {
        const x = 30 + i * 252, g = el("g", {}, svg);
        const bg = el("rect", { x, y: 430, width: 236, height: 60, rx: 14, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, g);
        el("rect", { x: x + 16, y: 448, width: 24, height: 24, rx: 5, fill: COL[i], stroke: INK, "stroke-width": 2 }, g);
        txt(g, x + 52, 467, n, { "font-size": 21 });
        return { bg, cx: x + 118 };
      });
      const tag = el("g", {}, svg);
      el("path", { d: "M0 -14 V0", stroke: INK, "stroke-width": 2.5 }, tag);
      el("rect", { x: -58, y: 0, width: 116, height: 36, rx: 18, fill: YEL, stroke: INK, "stroke-width": 2.5 }, tag);
      txt(tag, 0, 25, "Limit hit", { "text-anchor": "middle", "font-size": 19, "font-weight": 700 });
      let mode = null, lastT = 0, lastNow = 0, ang = 0;
      const autoCur = (t) => (t < 4.3 ? 0 : 1);
      button(mill, "Windmill: stop the current sail and let the next one take over", () => {
        const from = mode ? mode.to : autoCur(lastT);
        mode = { from, to: (from + 1) % 3, at: api.now() }; lastNow = mode.at; api.poke();
      });
      return (t, now) => {
        let cur, tagAt, tagK, catchK, w;
        if (!mode) {
          ang = th(t); lastT = t; cur = autoCur(t); tagAt = 0;
          tagK = t < 0.5 ? 1 - seg(t, 0, 0.4) : ob(seg(t, 3.5, 3.9));
          catchK = Math.sin(Math.PI * seg(t, 4.4, 5.0)); w = vA(t);
        } else {
          const s = now - mode.at; ang += B * vU(s) * cl(now - lastNow, 0, 0.1); lastNow = now;
          cur = s < 1.2 ? mode.from : mode.to; tagAt = mode.from;
          tagK = ob(seg(s, 0.5, 0.9)); catchK = Math.sin(Math.PI * seg(s, 1.2, 1.8)); w = vU(s);
        }
        tf(rotor, HX, HY, 1, ang);
        sails.forEach((a, i) => a.setAttribute("transform", `scale(${i === cur ? 1 + 0.1 * catchK : 1})`));
        cards.forEach((c, i) => c.bg.setAttribute("fill", i === cur ? COL[i] : "#fff"));
        tf(tag, cards[tagAt].cx, 504, 0.5 + 0.5 * tagK); tag.setAttribute("opacity", cl(tagK * 2));
        wind.forEach((p) => { p.setAttribute("opacity", cl((w - 0.1) / 0.9)); p.setAttribute("stroke-dashoffset", -ang / 6); });
      };
    },
  };

  /* ---- 3. three paper lanterns: two glow for the desktop app, one stays pale ---- */
  SC.lantern = {
    dur: 8, still: 8,
    build(svg, api) {
      const LX = [170, 400, 630], NAME = ["macOS", "Linux", "Windows"], ON = [1.0, 1.7];
      const gid = nid("glow"), rg = el("radialGradient", { id: gid }, el("defs", {}, svg));
      el("stop", { offset: "0", "stop-color": YEL, "stop-opacity": 0.75 }, rg);
      el("stop", { offset: "0.55", "stop-color": YEL, "stop-opacity": 0.3 }, rg);
      el("stop", { offset: "1", "stop-color": YEL, "stop-opacity": 0 }, rg);
      el("path", { d: "M40 180 Q400 208 760 180", stroke: INK, "stroke-width": 2.5, fill: "none", "stroke-linecap": "round" }, svg);
      const ya = (x) => { const u = (x - 40) / 720; return 180 + 56 * u * (1 - u); };
      const mid = (LX[0] + LX[1]) / 2, lab = el("g", {}, svg);
      el("path", { d: `M${LX[0]} 168 V154 H${LX[1]} V168 M${mid} 154 V144`, stroke: INK, "stroke-width": 2.5, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, lab);
      el("rect", { x: mid - 92, y: 100, width: 184, height: 44, rx: 22, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, lab);
      txt(lab, mid, 129, "Desktop app", { "text-anchor": "middle", "font-size": 22, "font-weight": 700 });
      const tap = [-99, -99, -99];
      const L = LX.map((x, i) => {
        const outer = el("g", {}, svg), g = el("g", {}, outer);
        tf(outer, x, ya(x));
        const halo = el("circle", { cx: 0, cy: 112, r: 112, fill: `url(#${gid})` }, g);
        ring(g, { x: -88, y: 22, width: 176, height: i === 2 ? 296 : 250, rx: 22 });
        el("path", { d: "M0 0 V34", stroke: INK, "stroke-width": 2.5 }, g);
        el("rect", { x: -26, y: 32, width: 52, height: 12, rx: 4, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, g);
        const body = el("ellipse", { cx: 0, cy: 112, rx: 72, ry: 68, fill: SOFT, stroke: INK, "stroke-width": 3 }, g);
        el("ellipse", { cx: 0, cy: 112, rx: 44, ry: 68, fill: "none", stroke: INK, "stroke-width": 1.5 }, g);
        el("ellipse", { cx: 0, cy: 112, rx: 16, ry: 68, fill: "none", stroke: INK, "stroke-width": 1.5 }, g);
        el("rect", { x: -26, y: 178, width: 52, height: 12, rx: 4, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, g);
        el("path", { d: "M0 190 V212", stroke: INK, "stroke-width": 2.5 }, g);
        el("rect", { x: -62, y: 212, width: 124, height: 44, rx: 10, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, g);
        txt(g, 0, 241, NAME[i], { "text-anchor": "middle", "font-family": MONO, "font-size": 21, "font-weight": 700 });
        let cli = null;
        if (i === 2) {
          cli = el("g", {}, g);
          el("path", { d: "M0 256 V272", stroke: INK, "stroke-width": 2.5 }, cli);
          el("rect", { x: -36, y: 272, width: 72, height: 34, rx: 17, fill: SKY, stroke: INK, "stroke-width": 2.5 }, cli);
          txt(cli, 0, 295, "CLI", { "text-anchor": "middle", "font-family": MONO, "font-size": 19, "font-weight": 700 });
        }
        button(g, `${NAME[i]} lantern: ${i < 2 ? "Desktop app" : "CLI"}`, () => { tap[i] = api.now(); api.poke(); });
        return { g, halo, body, cli };
      });
      const pop = (n, k, cx, cy) => { n.setAttribute("opacity", cl(k)); n.setAttribute("transform", `translate(${cx} ${cy}) scale(${0.6 + 0.4 * k}) translate(${-cx} ${-cy})`); };
      return (t, now) => {
        const fade = 1 - seg(t, 0, 0.35);
        pop(lab, t < 0.35 ? fade : ob(seg(t, 2.5, 2.9)), mid, 122);
        L.forEach((l, i) => {
          const s = now - tap[i], hit = s >= 0 && s < 3;
          let sway = 2 * Math.sin((2 * Math.PI * t * 2) / 8 + i * 1.3);
          if (hit) sway += 12 * Math.exp(-1.5 * s) * Math.sin(6 * s);
          l.g.setAttribute("transform", `rotate(${sway})`);
          if (i === 2) { pop(l.cli, t < 0.35 ? fade : ob(seg(t, 3.3, 3.7)), 0, 272); l.halo.setAttribute("opacity", 0); return; }
          let lit = t < 0.35 || t >= ON[i], h = t < 0.35 ? 1 - seg(t, 0.05, 0.35) : ob(seg(t, ON[i], ON[i] + 0.5));
          if (hit) { lit = true; h = Math.max(h, 1) + 0.4 * Math.exp(-2.2 * s); }
          l.body.setAttribute("fill", lit ? YEL : SOFT);
          const sc = Math.max(0.01, h * (1 + 0.05 * Math.sin((2 * Math.PI * t * 4) / 8 + i)));
          l.halo.setAttribute("opacity", lit ? cl(h) : 0);
          l.halo.setAttribute("transform", `translate(0 112) scale(${sc}) translate(0 -112)`);
        });
      };
    },
  };

  /* ---- title card, 16 by 9 ---- */
  SC.hero = {
    w: 960, h: 540, dur: 6, still: 6,
    build(svg) {
      el("rect", { x: 56, y: 84, width: 158, height: 40, rx: 20, fill: LIL, stroke: INK, "stroke-width": 2 }, svg);
      txt(svg, 135, 110, "Alternatives", { "text-anchor": "middle", "font-size": 19, "font-weight": 600 });
      txt(svg, 56, 198, "Reason Machines", { "font-size": 54, "font-weight": 700 });
      txt(svg, 56, 262, "alternatives", { "font-size": 54, "font-weight": 700 });
      el("path", { d: "M60 288 H380", stroke: YEL, "stroke-width": 12, "stroke-linecap": "round" }, svg);
      txt(svg, 56, 338, "5 tools like Reason for team coding agents", { "font-size": 21, "font-weight": 500, fill: MUTE });
      txt(svg, 56, 378, "Checked 11 Nov 2026", { "font-size": 17, "font-weight": 500, fill: MUTE });
      el("rect", { x: 590, y: 84, width: 300, height: 52, rx: 12, fill: SOFT, stroke: INK, "stroke-width": 2 }, svg);
      txt(svg, 740, 117, "Reason Machines", { "text-anchor": "middle", "font-family": MONO, "font-size": 19, "font-weight": 700, fill: MUTE });
      const spine = el("path", { d: "M614 136 V136", stroke: INK, "stroke-width": 2, fill: "none", "stroke-linecap": "round" }, svg);
      const T = ["Devin", "Munder Difflin", "OpenAI Codex cloud", "Claude Code on the web", "Cursor Cloud Agents"], C = [SKY, YEL, LIL, MINT, BLUE];
      const tiles = T.map((n, i) => {
        const g = el("g", {}, svg), y = 156 + i * 58;
        el("path", { d: `M614 ${y + 22} H640`, stroke: INK, "stroke-width": 2, "stroke-linecap": "round" }, g);
        el("rect", { x: 640, y, width: 262, height: 44, rx: 10, fill: C[i], stroke: INK, "stroke-width": 2 }, g);
        txt(g, 656, y + 28, n, { "font-family": MONO, "font-size": 17, "font-weight": 700 });
        return g;
      });
      return (t) => {
        spine.setAttribute("d", `M614 136 V${136 + 274 * oc(seg(t, 0.3, 1.0))}`);
        tiles.forEach((g, i) => { const k = oc(seg(t, 0.6 + i * 0.35, 1.1 + i * 0.35)); g.setAttribute("opacity", k); g.setAttribute("transform", `translate(${60 * (1 - k)} 0)`); });
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
