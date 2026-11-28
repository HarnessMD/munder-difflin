/* Bright coded scenes for "OpenCode 2.0: what changed and how to upgrade". Vanilla JS, no library.
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
  const lerp = (a, b, k) => a + (b - a) * k;
  const D2R = Math.PI / 180;
  /* a soft rounded strip along the bottom that carries one line of the post */
  const strip = (svg, y, w = 720) => {
    el("rect", { x: (800 - w) / 2, y, width: w, height: 48, rx: 24, fill: SOFT, stroke: INK, "stroke-width": 2 }, svg);
    return txt(svg, 400, y + 32, "", { "text-anchor": "middle", "font-size": 22, "font-weight": 600 });
  };

  const SC = {};

  /* ---- 1. a lighthouse: one beam turns across the sea and lights each boat it reaches ---- */
  SC.lighthouse = {
    dur: 12, still: 10.4,
    build(svg, api) {
      txt(svg, 44, 62, "What is the OpenCode service?", { "font-size": 32, "font-weight": 700 });
      const LX = 650, LY = 146, HZ = 236;
      /* sea */
      el("rect", { x: 30, y: HZ, width: 740, height: 268, rx: 20, fill: SKY, "fill-opacity": 0.22 }, svg);
      el("path", { d: `M44 ${HZ} H756`, stroke: SKY, "stroke-width": 3, "stroke-linecap": "round" }, svg);
      const waves = [[70, 280], [250, 268], [420, 300], [90, 420], [240, 470], [560, 260], [380, 410], [190, 330]].map(([x, y]) => ({ x, y, n: el("path", { d: "M0 0 q10 -8 20 0 t20 0", stroke: SKY, "stroke-width": 3, fill: "none", "stroke-linecap": "round" }, svg) }));
      /* the beam sits behind the boats */
      const clip = el("clipPath", { id: "mg-oc-sea" }, el("defs", {}, svg));
      el("rect", { x: 0, y: 0, width: 800, height: 504 }, clip);
      const lightG = el("g", { "clip-path": "url(#mg-oc-sea)" }, svg);
      const halo = el("path", { fill: YEL, "fill-opacity": 0.22 }, lightG);
      const beam = el("path", { fill: YEL, "fill-opacity": 0.5 }, lightG);
      const BOATS = [["TUI", 130, 290], ["web", 262, 364], ["desktop app", 402, 452]];
      const ang = (x, y) => Math.atan2(y - LY, x - LX) / D2R;
      let user = null;
      const boats = BOATS.map(([name, x, y], i) => {
        const g = el("g", {}, svg);
        const probe = txt(g, 0, 0, name, { "font-size": 24, "font-weight": 700 });
        const tw = probe.getComputedTextLength(); probe.remove();
        const hw = Math.max(70, tw / 2 + 30);
        el("rect", { x: -hw - 14, y: -100, width: 2 * hw + 28, height: 152, rx: 18, fill: "#fff", "fill-opacity": 0, stroke: INK, "stroke-width": 2, class: "mg-ring" }, g);
        const glow = el("circle", { cx: 12, cy: -72, r: 24, fill: YEL, "fill-opacity": 0.4 }, g);
        el("path", { d: "M12 -4 V-62", stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, g);
        const lamp = el("circle", { cx: 12, cy: -72, r: 10, fill: SOFT, stroke: INK, "stroke-width": 3 }, g);
        el("rect", { x: -hw + 18, y: -36, width: 44, height: 32, rx: 6, fill: SOFT, stroke: INK, "stroke-width": 3 }, g);
        el("path", { d: `M${-hw} -4 H${hw} L${hw - 22} 40 H${-hw + 22} Z`, fill: "#fff", stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, g);
        txt(g, 0, 26, name, { "text-anchor": "middle", "font-size": 24, "font-weight": 700 });
        button(g, `${name}: one background process shared by the TUI, web and desktop app`, () => { user = { i, t0: api.now() }; api.poke(); });
        return { g, x, y, a: ang(x + 12, y - 72), glow, lamp };
      });
      /* the lighthouse, on a rock at the right */
      const lh = el("g", {}, svg);
      el("path", { d: `M${LX - 100} 478 Q${LX - 92} 430 ${LX - 52} 426 H${LX + 60} Q${LX + 104} 432 ${LX + 110} 478 Z`, fill: SOFT, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, lh);
      const tw = (y) => 30 + (y - 182) * (16 / 248);
      el("path", { d: `M${LX - tw(430)} 430 L${LX - tw(182)} 182 H${LX + tw(182)} L${LX + tw(430)} 430 Z`, fill: "#fff", stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, lh);
      [[230, 272], [318, 362]].forEach(([a, b]) => el("path", { d: `M${LX - tw(a)} ${a} H${LX + tw(a)} L${LX + tw(b)} ${b} H${LX - tw(b)} Z`, fill: BLUE, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, lh));
      el("rect", { x: LX - 13, y: 392, width: 26, height: 38, rx: 10, fill: LIL, stroke: INK, "stroke-width": 3 }, lh);
      el("rect", { x: LX - 50, y: 172, width: 100, height: 14, rx: 5, fill: YEL, stroke: INK, "stroke-width": 3 }, lh);
      el("rect", { x: LX - 32, y: 118, width: 64, height: 54, rx: 6, fill: "#fff", stroke: INK, "stroke-width": 3 }, lh);
      const core = el("circle", { cx: LX, cy: LY, r: 15, fill: YEL, stroke: INK, "stroke-width": 3 }, lh);
      el("path", { d: `M${LX - 12} 118 V172 M${LX + 12} 118 V172`, stroke: INK, "stroke-width": 2 }, lh);
      el("path", { d: `M${LX - 44} 120 L${LX} 82 L${LX + 44} 120 Z`, fill: BLUE, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, lh);
      el("circle", { cx: LX, cy: 76, r: 7, fill: YEL, stroke: INK, "stroke-width": 3 }, lh);
      const plate = el("g", { transform: `translate(${LX - 10} 500)` }, svg);
      const pt = txt(plate, 0, 9, "OpenCode service", { "text-anchor": "middle", "font-size": 24, "font-weight": 700 });
      const pw = pt.getComputedTextLength() + 36;
      el("rect", { x: -pw / 2, y: -24, width: pw, height: 48, rx: 24, fill: YEL, stroke: INK, "stroke-width": 3 }, plate).after(pt);
      plate.setAttribute("transform", `translate(${Math.min(LX - 4, 768 - pw / 2)} 474)`);
      /* the beam: down across the sea, then slowly back */
      const sweep = (t) => io(seg(t, 0.6, 6)) - io(seg(t, 6.4, 11.6));
      const th = (t) => 176 - 52 * sweep(t);
      const litAt = boats.map((b) => { for (let s = 0; s < 6.2; s += 0.02) if (Math.abs(th(s) - b.a) < 5) return s; return 99; });
      const wedge = (a, h, len) => { const p = (d) => `${(LX + len * Math.cos(d * D2R)).toFixed(1)} ${(LY + len * Math.sin(d * D2R)).toFixed(1)}`; return `M${LX} ${LY} L${p(a - h)} L${p(a + h)} Z`; };
      const cap = strip(svg, 536 - 4, 740);
      return (t, now) => {
        const out = seg(t, 11.3, 11.8);
        let a = th(t), held = -1;
        if (user) { const w = now - user.t0, k = io(seg(w, 0, 0.5)) * (1 - io(seg(w, 3, 3.5))); a = lerp(a, boats[user.i].a, k); if (w < 3.5) held = user.i; else user = null; }
        beam.setAttribute("d", wedge(a, 6, 760)); halo.setAttribute("d", wedge(a, 12, 760));
        const on = 1 - out;
        beam.setAttribute("opacity", seg(t, 0.2, 0.6) * on + (held >= 0 ? 1 : 0) * out);
        halo.setAttribute("opacity", seg(t, 0.2, 0.6) * on + (held >= 0 ? 1 : 0) * out);
        core.setAttribute("fill", YEL);
        boats.forEach((b, i) => {
          tf(b.g, b.x, b.y + 3 * Math.sin(t * 1.6 + i * 2), 1, 1.5 * Math.sin(t * 1.3 + i));
          const lit = held === i ? 1 : seg(t, litAt[i], litAt[i] + 0.25) * on;
          b.glow.setAttribute("opacity", lit); b.lamp.setAttribute("fill", lit > 0.5 ? YEL : SOFT);
        });
        waves.forEach((w, i) => { const p = (t / 3 + i * 0.13) % 1; tf(w.n, w.x + 18 * p, w.y); w.n.setAttribute("opacity", Math.sin(Math.PI * p)); });
        cap.textContent = t < 6.2 || t >= 11.3 ? "One background process shared by the TUI, web and desktop app" : "a single background process on your machine";
      };
    },
  };

  /* ---- 2. a domino run: one script tips every tool in a single fall ---- */
  SC.dominoes = {
    dur: 12, still: 9.6,
    build(svg, api) {
      txt(svg, 44, 62, "What is Code Mode?", { "font-size": 32, "font-weight": 700 });
      const W = 40, H = 150, N = 9, X0 = 112, SP = 56;
      const sm = (k) => k * k * (3 - 2 * k);
      const g = (x) => 250 + 225 * sm(cl((x - 90) / 430));
      let d = "M30 590 V" + g(30);
      for (let x = 30; x <= 770; x += 10) d += ` L${x} ${g(x).toFixed(1)}`;
      el("path", { d: d + " V590 Z", fill: SOFT }, svg);
      let top = "M30 " + g(30);
      for (let x = 30; x <= 770; x += 10) top += ` L${x} ${g(x).toFixed(1)}`;
      el("path", { d: top, stroke: INK, "stroke-width": 3, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, svg);
      /* the card that carries the post's words */
      el("rect", { x: 452, y: 92, width: 314, height: 182, rx: 20, fill: "#fff", stroke: INK, "stroke-width": 3 }, svg);
      const lines = [0, 1, 2, 3].map((k) => txt(svg, 476, 138 + k * 38, "", { "font-size": 26, "font-weight": 700 }));
      const run = el("g", {}, svg);
      el("rect", { x: 24, y: 84, width: 418, height: 186, rx: 20, fill: "#fff", "fill-opacity": 0, stroke: INK, "stroke-width": 2, class: "mg-ring" }, run);
      /* ramp and ball */
      el("path", { d: "M90 146 V" + g(90), stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, run);
      el("path", { d: "M34 100 L102 143 L98 150 L30 107 Z", fill: SOFT, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, run);
      const ball = el("circle", { r: 14, fill: MINT, stroke: INK, "stroke-width": 3 }, run);
      const COL = [SKY, LIL, MINT, BLUE];
      const ds = Array.from({ length: N }, (_, i) => {
        const x = X0 + i * SP, by = g(x + W / 2), gr = el("g", {}, run);
        el("rect", { x: -W, y: -H, width: W, height: H, rx: 7, fill: i ? COL[(i - 1) % 4] : YEL, stroke: INK, "stroke-width": 3 }, gr);
        txt(gr, -W / 2, -H / 2 + 9, i ? "tool" : "script", { "text-anchor": "middle", "font-size": 25, "font-weight": 700, transform: `rotate(-90 ${-W / 2} ${-H / 2})` });
        return { gr, bx: x + W, by, t0: 1.25 + i * 0.3 };
      });
      button(run, "Replay the run: a single round trip instead of calling them one at a time", () => { api.seek(0.2); });
      /* does domino i, tipped to phi, touch the ground or domino i+1 (tipped to an)? checks points up its leading face */
      const hit = (i, phi, an) => {
        const b = ds[i], s = Math.sin(phi * D2R), c = Math.cos(phi * D2R);
        if (b.by - H * c >= g(b.bx + H * s) - 1.5) return true;
        if (i === N - 1) return false;
        const n = ds[i + 1], a = an * D2R, ca = Math.cos(a), sa = Math.sin(a);
        for (const f of [0.3, 0.45, 0.6, 0.75, 0.9, 1]) {
          const dx = b.bx + H * f * s - n.bx, dy = b.by - H * f * c - n.by;
          const u = dx * ca + dy * sa, v = -dx * sa + dy * ca;
          if (u >= -W && u <= 1.5 && v >= -H && v <= 0) return true;
        }
        return false;
      };
      const EARLY = ["A script can call", "a tool, map over the", "results and call", "another tool"], LATE = ["Single round trip", "instead of calling", "them one at a time", ""];
      return (t) => {
        const out = seg(t, 11.3, 11.8);
        const angs = new Array(N);
        for (let i = N - 1; i >= 0; i--) {
          const k = seg(t, ds[i].t0, ds[i].t0 + 0.8), free = 90 * k * k;
          let a = free;
          for (let p = 0; p <= free; p += 0.5) if (hit(i, p, i < N - 1 ? angs[i + 1] : 0)) { a = p; break; }
          angs[i] = a;
        }
        ds.forEach((b, i) => { b.gr.setAttribute("transform", `translate(${b.bx} ${b.by}) rotate(${angs[i] * (1 - out)})`); b.gr.setAttribute("opacity", 1 - out * 0.0); });
        /* the ball rolls down the ramp, knocks the script domino, settles back */
        const r = seg(t, 0.3, 1.25), back = seg(t, 1.25, 1.7);
        const bx = lerp(47, 97, r * r) - 9 * Math.sin(Math.PI * back) - 3 * back, by = lerp(92, 123.5, r * r) - 8 * Math.sin(Math.PI * back) - 2 * back;
        ball.setAttribute("cx", bx); ball.setAttribute("cy", by);
        ball.setAttribute("opacity", seg(t, 0.1, 0.3) * (1 - out));
        const L = t >= 4.6 && t < 11.3 ? LATE : EARLY;
        const m = L.filter(Boolean).length;
        lines.forEach((n, k) => { n.textContent = L[k]; n.setAttribute("y", 138 + k * 38 + (4 - m) * 19); });
      };
    },
  };

  /* ---- 3. a ferris wheel that never stops; cars clip on at the bottom as it turns ---- */
  SC.ferris = {
    dur: 12, still: 10.9,
    build(svg) {
      const CX = 400, CY = 244, R = 172, GND = 512;
      [[118, 118, 1.1], [690, 92, 0.9], [120, 400, 0.8], [688, 380, 1.0]].forEach(([x, y, s]) => {
        const c = el("g", { transform: `translate(${x} ${y}) scale(${s})` }, svg);
        [[-38, 2, 24], [-6, -16, 32], [32, -2, 25]].forEach(([cx, cy, r]) => el("circle", { cx, cy, r, fill: SOFT }, c));
        el("rect", { x: -62, y: 2, width: 119, height: 25, rx: 12.5, fill: SOFT }, c);
      });
      el("path", { d: `M44 ${GND} H756`, stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, svg);
      el("path", { d: `M${CX - 120} ${GND} L${CX} ${CY} L${CX + 120} ${GND}`, stroke: INK, "stroke-width": 7, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, svg);
      el("path", { d: `M${CX - 72} ${GND - 100} H${CX + 72}`, stroke: INK, "stroke-width": 4, "stroke-linecap": "round" }, svg);
      const wheel = el("g", {}, svg);
      el("circle", { cx: 0, cy: 0, r: R, fill: "none", stroke: INK, "stroke-width": 5 }, wheel);
      el("circle", { cx: 0, cy: 0, r: R - 22, fill: "none", stroke: LIL, "stroke-width": 4 }, wheel);
      for (let k = 0; k < 12; k++) { const a = (k * 30 + 15) * D2R; el("path", { d: `M0 0 L${(R * Math.cos(a)).toFixed(1)} ${(R * Math.sin(a)).toFixed(1)}`, stroke: INK, "stroke-width": k % 2 ? 2 : 3 }, wheel); }
      el("circle", { cx: 0, cy: 0, r: 26, fill: YEL, stroke: INK, "stroke-width": 3 }, wheel);
      el("circle", { cx: 0, cy: 0, r: 8, fill: "#fff", stroke: INK, "stroke-width": 3 }, svg).setAttribute("transform", `translate(${CX} ${CY})`);
      el("rect", { x: CX - 92, y: GND - 18, width: 184, height: 18, rx: 6, fill: SOFT, stroke: INK, "stroke-width": 3 }, svg);
      /* six hanging points; each gets a car the first time it passes the bottom */
      const B = 15, OM = 30;
      const order = [1, 0, 5, 4, 3, 2];
      const slots = Array.from({ length: 6 }, (_, k) => {
        const pin = el("circle", { r: 7, fill: "#fff", stroke: INK, "stroke-width": 3 }, svg);
        const car = el("g", {}, svg);
        const n = order.indexOf(k), name = n % 2 ? "shell" : "subagent";
        el("path", { d: "M0 0 V16", stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, car);
        el("path", { d: "M-46 24 Q0 6 46 24 Z", fill: BLUE, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, car);
        el("rect", { x: -64, y: 24, width: 128, height: 50, rx: 12, fill: n % 2 ? MINT : LIL, stroke: INK, "stroke-width": 3 }, car);
        txt(car, 0, 57, name, { "text-anchor": "middle", "font-size": 24, "font-weight": 700 });
        let ta = (((90 - B - 60 * k) / OM) % 12 + 12) % 12;
        return { pin, car, ta };
      });
      const cap = strip(svg, 530, 740);
      return (t) => {
        const out = seg(t, 11.3, 11.8), rot = OM * t;
        wheel.setAttribute("transform", `translate(${CX} ${CY}) rotate(${rot})`);
        slots.forEach((s, k) => {
          const a = (B + 60 * k + rot) * D2R, x = CX + R * Math.cos(a), y = CY + R * Math.sin(a);
          s.pin.setAttribute("cx", x); s.pin.setAttribute("cy", y);
          const q = seg(t, s.ta - 0.35, s.ta + 0.15), lift = 1 - ob(q);
          const sw = 3 * Math.sin(t * 2.2 + k);
          s.car.setAttribute("transform", `translate(${x} ${y + 60 * lift}) rotate(${sw})`);
          s.car.setAttribute("opacity", (q <= 0 ? 0 : cl(q * 3)) * (1 - out));
        });
        cap.textContent = t < 6 || t >= 11.3 ? "Hand work to a background subagent and continue" : "The shell tool can be invoked asynchronously";
      };
    },
  };

  /* ---- 4. building bricks: plugins drop in and snap into a tower ---- */
  SC.bricks = {
    dur: 12, still: 9.8,
    build(svg, api) {
      txt(svg, 44, 62, "What changed for plugins and the SDK?", { "font-size": 32, "font-weight": 700 });
      const BW = 170, BH = 58, TX = 286, BASE = 446, COL = [BLUE, YEL, LIL, MINT, SKY];
      const brick = (p, fill) => {
        const g = el("g", {}, p);
        [-38, 0, 38].forEach((x) => el("rect", { x: x - 13, y: -BH / 2 - 11, width: 26, height: 14, rx: 4, fill, stroke: INK, "stroke-width": 3 }, g));
        el("rect", { x: -BW / 2, y: -BH / 2, width: BW, height: BH, rx: 7, fill, stroke: INK, "stroke-width": 3 }, g);
        txt(g, 0, 9, "plugin", { "text-anchor": "middle", "font-size": 26, "font-weight": 700 });
        return g;
      };
      el("path", { d: "M40 490 H760", stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, svg);
      const tower = el("g", {}, svg);
      el("rect", { x: 40, y: 82, width: 480, height: 412, rx: 20, fill: "#fff", "fill-opacity": 0, stroke: INK, "stroke-width": 2, class: "mg-ring" }, tower);
      el("rect", { x: TX - 196, y: BASE, width: 392, height: 44, rx: 10, fill: SOFT, stroke: INK, "stroke-width": 3 }, tower);
      txt(tower, TX, BASE + 32, "OpenCode 2.0", { "text-anchor": "middle", "font-size": 28, "font-weight": 700 });
      const bricks = [];
      for (let r = 0; r < 5; r++) for (let c = 0; c < 2; c++) {
        const i = bricks.length, off = r % 2 ? 16 : -16;
        bricks.push({ g: brick(tower, COL[i % 5]), x: TX + off + (c ? BW / 2 : -BW / 2), y: BASE - BH * r - BH / 2, t0: 0.6 + i * 0.6 });
      }
      let extra = -99;
      const xb = { g: brick(tower, YEL), x: TX, y: BASE - BH * 5 - BH / 2 };
      button(tower, "Add a plugin: OpenCode can write a plugin for itself mid session and use it right away", () => { extra = api.now(); api.poke(); });
      /* the card beside the tower */
      el("rect", { x: 548, y: 160, width: 214, height: 260, rx: 22, fill: "#fff", stroke: INK, "stroke-width": 3 }, svg);
      txt(svg, 655, 214, "there are now", { "text-anchor": "middle", "font-size": 26, "font-weight": 600, fill: MUTE });
      const num = txt(svg, 655, 324, "80+", { "text-anchor": "middle", "font-size": 92, "font-weight": 700 });
      txt(svg, 655, 384, "of them", { "text-anchor": "middle", "font-size": 26, "font-weight": 600, fill: MUTE });
      const track = el("rect", { x: 576, y: 284, width: 158, height: 22, rx: 11, fill: SOFT, stroke: INK, "stroke-width": 2 }, svg);
      const fill = el("rect", { x: 576, y: 284, height: 22, rx: 11, fill: LIL, stroke: INK, "stroke-width": 2 }, svg);
      const cap = strip(svg, 522, 740);
      const drop = (b, k) => {
        const y = b.y - 520 * (1 - k * k), land = k >= 1 ? 1 : 0;
        b.g.setAttribute("transform", `translate(${b.x} ${y})`);
        b.g.setAttribute("opacity", k <= 0 ? 0 : 1);
        return land;
      };
      return (t, now) => {
        const out = seg(t, 11.3, 11.8);
        let landed = 0;
        bricks.forEach((b) => { landed += drop(b, seg(t, b.t0, b.t0 + 0.5)); b.g.setAttribute("opacity", (t >= b.t0 ? 1 : 0) * (1 - out)); });
        const w = now - extra, xk = seg(w, 0, 0.5);
        drop(xb, xk); xb.g.setAttribute("opacity", w >= 0 && w < 6 ? 1 : 0);
        const done = ob(seg(t, 6.6, 7.1));
        num.setAttribute("transform", `translate(655 300) scale(${cl(done, 0, 1.2)}) translate(-655 -300)`);
        num.setAttribute("opacity", (done > 0.01 ? 1 : 0) * (1 - out));
        const f = cl(landed / 10), gone = done > 0.01 || out > 0 ? 0 : 1;
        fill.setAttribute("width", Math.max(22, 158 * f)); fill.setAttribute("opacity", f > 0 ? gone : 0);
        track.setAttribute("opacity", gone);
        cap.textContent = w >= 0 && w < 6 ? "write a plugin for itself mid session and use it right away" : t < 7 || t >= 11.3 ? "nearly every 2.0 feature is an internal plugin" : "TUI plugins moved from experimental to stable";
      };
    },
  };

  /* ---- title card, 16 by 9: a weathervane turning in the wind ---- */
  SC.hero = {
    w: 960, h: 540, dur: 8, still: 4,
    build(svg) {
      txt(svg, 66, 150, "What changed", { "font-size": 30, "font-weight": 600, fill: MUTE });
      txt(svg, 60, 250, "OpenCode 2.0", { "font-size": 78, "font-weight": 700 });
      el("path", { d: "M68 284 H530", stroke: YEL, "stroke-width": 14, "stroke-linecap": "round" }, svg);
      el("rect", { x: 62, y: 326, width: 330, height: 58, rx: 29, fill: SOFT, stroke: INK, "stroke-width": 3 }, svg);
      txt(svg, 227, 364, "Checked 15 Oct 2026", { "text-anchor": "middle", "font-size": 27, "font-weight": 700 });
      el("path", { d: "M70 470 C190 414 300 510 420 454 S560 418 612 390", stroke: LIL, "stroke-width": 5, fill: "none", "stroke-linecap": "round", "stroke-dasharray": "1 16" }, svg);
      el("circle", { cx: 70, cy: 470, r: 11, fill: MINT, stroke: INK, "stroke-width": 3 }, svg);
      const VX = 806;
      const wind = [[650, 140, 60], [866, 120, 50], [640, 420, 54], [880, 380, 44]].map(([x, y, w]) => ({ x, y, n: el("path", { d: `M0 0 H${w}`, stroke: SKY, "stroke-width": 5, "stroke-linecap": "round" }, svg) }));
      /* roof, pole, arms */
      el("path", { d: `M${VX - 112} 500 L${VX} 440 L${VX + 112} 500 Z`, fill: BLUE, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, svg);
      el("path", { d: `M${VX} 438 V118`, stroke: INK, "stroke-width": 6, "stroke-linecap": "round" }, svg);
      el("path", { d: `M${VX - 92} 336 H${VX + 92}`, stroke: INK, "stroke-width": 5, "stroke-linecap": "round" }, svg);
      el("path", { d: `M${VX - 48} 362 L${VX + 48} 310`, stroke: INK, "stroke-width": 4, "stroke-linecap": "round" }, svg);
      [[VX - 92, 336, 11, LIL], [VX + 92, 336, 11, LIL], [VX - 48, 362, 8, SKY], [VX + 48, 310, 8, SKY]].forEach(([x, y, r, c]) => el("circle", { cx: x, cy: y, r, fill: c, stroke: INK, "stroke-width": 3 }, svg));
      el("circle", { cx: VX, cy: 336, r: 10, fill: YEL, stroke: INK, "stroke-width": 3 }, svg);
      /* the arrow turns about the pole */
      const arrow = el("g", {}, svg);
      el("path", { d: "M-90 0 H80", stroke: INK, "stroke-width": 6, "stroke-linecap": "round" }, arrow);
      el("path", { d: "M118 0 L76 -22 L84 0 L76 22 Z", fill: YEL, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, arrow);
      el("path", { d: "M-60 0 L-96 -42 H-128 L-102 0 L-128 42 H-96 Z", fill: MINT, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, arrow);
      el("circle", { cx: VX, cy: 210, r: 9, fill: "#fff", stroke: INK, "stroke-width": 3 }, svg);
      const cap = el("circle", { cx: VX, cy: 112, r: 12, fill: YEL, stroke: INK, "stroke-width": 3 }, svg);
      [[600, 70, 14, SKY], [904, 262, 15, MINT], [520, 500, 12, YEL]].forEach(([x, y, r, col]) => el("path", { d: `M0 ${-r} Q0 0 ${r} 0 Q0 0 0 ${r} Q0 0 ${-r} 0 Q0 0 0 ${-r} Z`, fill: col, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round", transform: `translate(${x} ${y})` }, svg));
      svg.appendChild(cap);
      return (t) => {
        const a = 28 * Math.sin((Math.PI * 2 * t) / 8) + 6 * Math.sin((Math.PI * 2 * t) / 2);
        arrow.setAttribute("transform", `translate(${VX} 210) scale(${Math.cos(a * D2R).toFixed(3)} 1)`);
        wind.forEach((w, i) => { const p = (t / 2 + i * 0.27) % 1; tf(w.n, w.x - 30 + 40 * p, w.y); w.n.setAttribute("opacity", Math.sin(Math.PI * p)); });
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
