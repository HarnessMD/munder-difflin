/* Bright coded scenes for "How to ask AI a private question with Duck.ai, free, no account". Vanilla JS, no library.
   <figure class="mg" data-scene="NAME"> holds a still image; this script swaps in a live SVG.
   Plays only in view, honours reduced motion, "?mgstill" freezes each scene on its still frame. */
(() => {
  const NS = "http://www.w3.org/2000/svg";
  const INK = "#1A1320", YEL = "#FFCA54", BLUE = "#6C8EF5", LIL = "#B69CFF", MINT = "#7FD8AE", SKY = "#9AD8FF", SOFT = "#F1ECF9", MUTE = "#7A6A88", CAP = "#6B5878";
  const SANS = '"Space Grotesk", system-ui, sans-serif', MONO = '"JetBrains Mono", ui-monospace, monospace';
  const el = (t, a = {}, p) => { const n = document.createElementNS(NS, t); for (const k in a) n.setAttribute(k, a[k]); if (p) p.appendChild(n); return n; };
  const txt = (p, x, y, s, a = {}) => { const n = el("text", Object.assign({ x, y, "font-family": SANS, "font-size": 24, "font-weight": 600, fill: INK }, a), p); n.textContent = s; return n; };
  const mono = (a = {}) => Object.assign({ "text-anchor": "middle", "font-family": MONO, "font-size": 22, "font-weight": 700 }, a);
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
  const ring = (p, x, y, w, h, rx) => el("rect", { x, y, width: w, height: h, rx, fill: "#fff", "fill-opacity": 0, class: "mg-ring", stroke: INK, "stroke-width": 2.5, "stroke-dasharray": "4 7" }, p);
  let uid = 0; // counter for SVG ids, never random

  const SC = {};

  /* ---- 1. the IP address label is erased, a DuckDuckGo stamp goes on, the question stays ---- */
  SC.envelope = {
    dur: 9, pre: 1.4,
    build(svg, api) {
      const X0 = 40, X1 = 231, Y = 262, SL = 479;
      const cid = "mgclip" + (++uid);
      const cp = el("clipPath", { id: cid, clipPathUnits: "userSpaceOnUse" }, el("defs", {}, svg));
      el("rect", { x: 0, y: 0, width: SL, height: 600 }, cp);
      const panel = el("g", {}, svg);
      el("rect", { x: 456, y: 150, width: 146, height: 350, rx: 18, fill: LIL }, panel);
      el("rect", { x: 446, y: 140, width: 146, height: 350, rx: 18, fill: BLUE, stroke: INK, "stroke-width": 3 }, panel);
      el("rect", { x: 469, y: 172, width: 20, height: 286, rx: 10, fill: SOFT, stroke: INK, "stroke-width": 3 }, panel);
      el("path", { d: "M526 290 L542 315 L526 340 M550 290 L566 315 L550 340", stroke: INK, "stroke-width": 3, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round", transform: "translate(1086 0) scale(-1 1)" }, panel);
      const lab = txt(svg, 519, 116, "model provider", mono());
      const env = el("g", {}, el("g", { "clip-path": `url(#${cid})` }, svg));
      ring(env, -20, -90, 340, 296, 22);
      el("rect", { x: 10, y: 10, width: 300, height: 180, rx: 12, fill: LIL }, env);
      el("path", { d: "M2 2 L150 -70 L298 2 Z", fill: SOFT, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, env);
      const card = el("g", {}, env);
      el("rect", { x: 25, y: -58, width: 210, height: 170, rx: 12, fill: MINT, stroke: INK, "stroke-width": 3 }, card);
      txt(card, 130, -21, "your question", mono());
      el("rect", { x: 0, y: 0, width: 300, height: 180, rx: 12, fill: SOFT, stroke: INK, "stroke-width": 3 }, env);
      el("path", { d: "M5 175 L150 96 L295 175", fill: "none", stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round", "stroke-linecap": "round" }, env);
      const label = el("g", {}, env);
      el("rect", { x: 16, y: 22, width: 160, height: 44, rx: 8, fill: LIL, stroke: INK, "stroke-width": 2.5 }, label);
      txt(label, 96, 52, "IP address", mono());
      const cover = el("rect", { x: 12, y: 18, width: 0, height: 52, fill: SOFT }, env);
      const crumbs = Array.from({ length: 6 }, (_, i) => el("circle", { r: 4 + (i % 2) * 1.5, fill: LIL, stroke: INK, "stroke-width": 1.5 }, env));
      const stamp = el("g", {}, env);
      el("rect", { x: -86, y: -28, width: 172, height: 56, rx: 6, fill: SKY, stroke: INK, "stroke-width": 3 }, stamp);
      el("rect", { x: -78, y: -20, width: 156, height: 40, rx: 3, fill: "none", stroke: "#fff", "stroke-width": 2.5, "stroke-dasharray": "5 5" }, stamp);
      txt(stamp, 0, 8, "DuckDuckGo", mono());
      const er = el("g", {}, svg);
      el("rect", { x: -50, y: -26, width: 100, height: 52, rx: 10, fill: YEL }, er);
      el("path", { d: "M14 -26 H40 Q50 -26 50 -16 V16 Q50 26 40 26 H14 Z", fill: SOFT }, er);
      el("rect", { x: -50, y: -26, width: 100, height: 52, rx: 10, fill: "none", stroke: INK, "stroke-width": 3 }, er);
      el("path", { d: "M14 -26 V26", stroke: INK, "stroke-width": 3 }, er);
      button(env, "Put the IP address label back and play it again", () => api.replay());
      return (t) => {
        const kp = oc(seg(t, 0, 0.6)), bump = Math.sin(Math.PI * seg(t, 6.55, 7.05)) * 7;
        tf(panel, 70 * (1 - kp) + bump, 0); panel.setAttribute("opacity", cl(seg(t, 0, 0.3)));
        const ke = ob(seg(t, 0.1, 0.7)), ex = X0 + (X1 - X0) * io(seg(t, 4.7, 6.7));
        tf(env, ex, Y + 46 * (1 - ke)); env.setAttribute("opacity", cl(seg(t, 0.1, 0.3)));
        tf(card, 0, 64 * (1 - ob(seg(t, 0.2, 0.8))));
        label.setAttribute("transform", `translate(96 44) scale(${ob(seg(t, 0.3, 0.8))}) translate(-96 -44)`);
        const ein = oc(seg(t, 1.4, 2.0)), w = io(seg(t, 2.0, 3.4)), eout = io(seg(t, 3.4, 4.0));
        const ax = X0 + 30 + 134 * w, ay = Y + 38 + Math.sin(w * Math.PI * 8) * 6, hx = -90, hy = 60;
        const px = eout > 0 ? ax + (hx - ax) * eout : hx + (ax - hx) * ein, py = eout > 0 ? ay + (hy - ay) * eout : hy + (ay - hy) * ein;
        tf(er, px, py, 1, -18 + Math.sin(w * Math.PI * 8) * 5); er.setAttribute("opacity", t > 1.4 && t < 4 ? 1 : 0);
        cover.setAttribute("width", 168 * w);
        crumbs.forEach((c, i) => { const s = 2.15 + i * 0.2, k = seg(t, s, s + 0.6), wx = io(seg(s, 2.0, 3.4)); c.setAttribute("cx", 30 + 134 * wx + (i % 2 ? 9 : -9) * k); c.setAttribute("cy", 68 + 56 * k * k); c.setAttribute("opacity", k > 0 && k < 1 ? 1 - k : 0); });
        const ks = seg(t, 3.8, 4.35);
        stamp.setAttribute("transform", `translate(96 44) rotate(-4) scale(${1.7 - 0.7 * ob(ks)})`); stamp.setAttribute("opacity", cl(ks * 3));
        const kl = oc(seg(t, 6.9, 7.6));
        lab.setAttribute("opacity", kl); lab.setAttribute("transform", `translate(0 ${16 * (1 - kl)})`);
      };
    },
  };

  /* ---- 2. a question drops into a lockbox, the lid stays shut, a reply comes out of the side ---- */
  SC.lockbox = {
    dur: 9, pre: 1.0,
    build(svg, api) {
      const BY = 236, CX = 320, SCL = 32 / 140;
      const box = el("g", {}, svg);
      ring(box, 120, BY - 162, 410, 362, 24);
      el("rect", { x: 150, y: BY + 10, width: 360, height: 180, rx: 16, fill: LIL }, box);
      const lid = el("rect", { x: 146, width: 348, fill: YEL, stroke: INK, "stroke-width": 3 }, box);
      const inner = el("rect", { x: 170, width: 300, rx: 10, fill: "none", stroke: INK, "stroke-width": 2.5 }, box);
      const card = el("g", {}, box);
      el("rect", { x: -115, y: -45, width: 230, height: 90, rx: 14, fill: SKY, stroke: INK, "stroke-width": 3 }, card);
      txt(card, 0, 8, "your question", mono());
      const reply = el("g", {}, box);
      el("rect", { x: 0, y: 0, width: 176, height: 64, rx: 12, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, reply);
      el("rect", { x: 46, y: 18, width: 110, height: 10, rx: 5, fill: LIL }, reply);
      el("rect", { x: 46, y: 36, width: 74, height: 10, rx: 5, fill: SKY }, reply);
      el("rect", { x: 140, y: BY, width: 360, height: 180, rx: 16, fill: BLUE, stroke: INK, "stroke-width": 3 }, box);
      el("circle", { cx: CX, cy: BY + 52, r: 22, fill: "#fff", stroke: INK, "stroke-width": 3 }, box);
      const key = el("g", {}, box);
      el("circle", { cx: 0, cy: -4, r: 6, fill: INK }, key);
      el("path", { d: "M-3 0 H3 L6 11 H-6 Z", fill: INK }, key);
      el("rect", { x: 486, y: BY + 16, width: 26, height: 84, rx: 8, fill: LIL, stroke: INK, "stroke-width": 3 }, box);
      const tag = el("g", {}, box);
      el("rect", { x: -158, y: -24, width: 316, height: 48, rx: 12, fill: MINT, stroke: INK, "stroke-width": 3 }, tag);
      txt(tag, 0, 7, "zero provider visibility", mono({ "font-size": 20 }));
      const SP = [[146, 195], [146, 225], [146, 255], [494, 285], [494, 315], [494, 345]];
      const sparks = SP.map(() => el("path", { stroke: SKY, "stroke-width": 5, "stroke-linecap": "round", fill: "none" }, box));
      button(box, "Drop another question card into the lockbox and play it again", () => api.replay());
      return (t, rw) => {
        const ke = ob(seg(t, 0, 0.6)), imp = Math.sin(Math.PI * seg(t, 3.25, 3.6)) * 5;
        tf(box, 0, 50 * (1 - ke) + imp); box.setAttribute("opacity", cl(seg(t, 0, 0.25)));
        const so = ob(seg(t, 0.12, 0.7)), kl = ob(seg(t, 2.7, 3.35)), s = Math.max(0.06, so - (so - SCL) * kl);
        const lh = 140 * s; lid.setAttribute("y", BY - lh); lid.setAttribute("height", lh); lid.setAttribute("rx", Math.min(14, lh / 2));
        inner.setAttribute("y", BY - lh + 22 * s); inner.setAttribute("height", 96 * s); inner.setAttribute("opacity", cl((s - 0.55) / 0.35));
        const ka = oc(seg(t, 1.0, 1.45)), kd = io(seg(t, 1.9, 2.65));
        const cy = 56 + 30 * ka + (BY + 130 - 96) * kd, rot = Math.sin(seg(t, 1.4, 1.95) * Math.PI * 2) * 4 * (1 - kd);
        tf(card, CX, cy, 1, rot); card.setAttribute("opacity", rw || t >= 2.7 ? 0 : ka);
        key.setAttribute("transform", `translate(${CX} ${BY + 52}) scale(${1 + 0.35 * Math.sin(Math.PI * seg(t, 3.4, 3.8))})`);
        const kz = seg(t, 3.3, 3.9);
        sparks.forEach((n, i) => { const [x, a] = SP[i], r = (a * Math.PI) / 180, d1 = 14 + 20 * oc(kz), d2 = d1 + 4 + 16 * (1 - kz), y = BY - 30; n.setAttribute("d", `M${x + Math.cos(r) * d1} ${y + Math.sin(r) * d1} L${x + Math.cos(r) * d2} ${y + Math.sin(r) * d2}`); n.setAttribute("opacity", kz > 0 && kz < 1 ? 1 - kz : 0); });
        tf(reply, 300 + 180 * ob(seg(t, 4.3, 5.5)), BY + 26);
        const kt = ob(seg(t, 6.0, 6.8));
        tf(tag, CX, BY + 128 - 40 * (1 - kt), 1, 8 * (1 - kt)); tag.setAttribute("opacity", cl(seg(t, 6.0, 6.2)));
      };
    },
  };

  /* ---- 3. Delete Chats: the shredder takes every card without a pin ---- */
  SC.shredder = {
    dur: 9.5, pre: 1.6,
    build(svg, api) {
      const PIN = 1, FLY = [0, 2, 3], T0 = [2.5, 3.35, 4.2], MX = 605, MY = 196, SY = 300, BX = 605, BYB = 124;
      const list = el("g", {}, svg);
      el("rect", { x: 70, y: 100, width: 300, height: 420, rx: 22, fill: SOFT }, list);
      el("rect", { x: 60, y: 90, width: 300, height: 420, rx: 22, fill: LIL, stroke: INK, "stroke-width": 3 }, list);
      const mk = (i) => {
        const g = el("g", {}), p = i === PIN;
        el("rect", { x: -125, y: -36, width: 250, height: 72, rx: 14, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, g);
        el("path", { d: "M-105 -16 H-77 Q-71 -16 -71 -10 V4 Q-71 10 -77 10 H-92 L-100 18 V10 H-105 Q-111 10 -111 4 V-10 Q-111 -16 -105 -16 Z", fill: "#fff", stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, g);
        el("rect", { x: -56, y: -14, width: p ? 64 : 130, height: 10, rx: 5, fill: LIL }, g);
        el("rect", { x: -56, y: 6, width: p ? 44 : 88 - i * 8, height: 10, rx: 5, fill: LIL }, g);
        return { g, x: 210, y: 154 + i * 96 };
      };
      const cards = [0, 1, 2, 3].map(mk);
      svg.appendChild(cards[PIN].g); FLY.forEach((i) => svg.appendChild(cards[i].g));
      const tag = el("g", {}, cards[PIN].g);
      el("rect", { x: 22, y: -16, width: 92, height: 34, rx: 8, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, tag);
      txt(tag, 68, 8, "Pinned", mono({ "font-size": 20 }));
      const pin = el("g", {}, cards[PIN].g);
      el("path", { d: "M0 -4 V12", stroke: INK, "stroke-width": 3.5, "stroke-linecap": "round" }, pin);
      el("circle", { cx: 0, cy: -14, r: 12, fill: SKY, stroke: INK, "stroke-width": 3 }, pin);
      el("circle", { cx: -4, cy: -18, r: 3, fill: "#fff" }, pin);
      el("path", { d: "M492 576 H718", stroke: SOFT, "stroke-width": 12, "stroke-linecap": "round" }, svg);
      const conf = Array.from({ length: 36 }, (_, id) => {
        const n = el("rect", { x: -4, y: -12, width: 8, height: 24, rx: 3, fill: MINT }, svg), j = id % 12;
        const xr = 520 + ((id * 47) % 170), m = 66 * (1 - Math.pow((xr - 605) / 95, 2)), f = 0.3 + 0.7 * (((id * 7) % 10) / 10);
        return { n, c: Math.floor(id / 12), j, x0: 532 + ((j * 14) % 150), xr, yr: 556 - m * f, rr: ((id * 67) % 160) - 80 };
      });
      const shred = el("g", {}, svg);
      el("rect", { x: 490, y: 260, width: 250, height: 160, rx: 18, fill: LIL }, shred);
      el("rect", { x: 480, y: 250, width: 250, height: 160, rx: 18, fill: BLUE, stroke: INK, "stroke-width": 3 }, shred);
      el("path", { d: "M545 326 H665 M545 352 H665", stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, shred);
      el("path", { d: "M510 262" + " l9 13 l9 -13".repeat(11), stroke: INK, "stroke-width": 2.5, fill: "none", "stroke-linejoin": "round", "stroke-linecap": "round" }, shred);
      el("rect", { x: 498, y: 240, width: 214, height: 18, rx: 9, fill: SOFT, stroke: INK, "stroke-width": 3 }, shred);
      el("rect", { x: 510, y: 402, width: 190, height: 14, rx: 7, fill: SOFT, stroke: INK, "stroke-width": 3 }, shred);
      const btn = el("g", {}, svg);
      ring(btn, -114, -38, 228, 76, 38);
      const glow = el("rect", { x: -95, y: -28, width: 190, height: 56, rx: 28, fill: "none", stroke: YEL, "stroke-width": 6 }, btn);
      const rays = Array.from({ length: 8 }, () => el("path", { stroke: YEL, "stroke-width": 5, "stroke-linecap": "round", fill: "none" }, btn));
      const face = el("g", {}, btn);
      el("rect", { x: -95, y: -28, width: 190, height: 56, rx: 28, fill: YEL, stroke: INK, "stroke-width": 3 }, face);
      txt(face, 0, 8, "Delete Chats", mono());
      button(btn, "Delete Chats: bring the cards back and shred them again", () => api.replay());
      return (t) => {
        const kl = ob(seg(t, 0, 0.6));
        tf(list, 0, 40 * (1 - kl)); list.setAttribute("opacity", cl(seg(t, 0, 0.2)));
        let act = 0, wig = 0;
        cards.forEach((c, i) => {
          const ki = oc(seg(t, 0.15 + i * 0.09, 0.65 + i * 0.09)), n = FLY.indexOf(i);
          let x = c.x - 40 * (1 - ki), y = c.y, s = 1, r = 0, op = ki;
          if (n >= 0) {
            const u = t - T0[n], lift = oc(seg(u, 0, 0.25)), fly = io(seg(u, 0.25, 0.95)), sink = io(seg(u, 0.95, 1.5));
            x += 14 * lift * (1 - fly) + (MX - c.x) * fly; y += (MY - c.y) * fly + 26 * Math.sin(Math.PI * fly) + (SY - MY) * sink;
            s = (1 + 0.06 * lift) * (1 - fly) + 0.8 * fly; r = -6 * Math.sin(Math.PI * fly);
            if (sink > 0 && sink < 1) act = 1; if (sink >= 1) op = 0;
            const w = seg(u, 0, 0.6); wig += Math.sin(w * Math.PI * 3) * 2 * (1 - w);
          }
          if (i === PIN) r = wig;
          tf(c.g, x, y, s, r); c.g.setAttribute("opacity", op);
        });
        const kp = ob(seg(t, 0.75, 1.2));
        tf(pin, 108, -36 - 50 * (1 - kp)); pin.setAttribute("opacity", cl(seg(t, 0.75, 0.85)));
        const kt = ob(seg(t, 0.9, 1.35)) * (1 + 0.12 * Math.sin(Math.PI * seg(t, 6.5, 7.1)));
        tag.setAttribute("transform", `translate(68 1) scale(${kt}) translate(-68 -1)`);
        conf.forEach((q) => {
          const ts = T0[q.c] + 1.1 + q.j * 0.035, k = seg(t, ts, ts + 0.75);
          tf(q.n, q.x0 + (q.xr - q.x0) * oc(k), 404 + (q.yr - 404) * k * k, 1, q.rr * oc(k)); q.n.setAttribute("opacity", k > 0 ? 1 : 0);
        });
        const ks = ob(seg(t, 0.35, 0.95));
        tf(shred, Math.sin(t * 70) * 2.5 * act, 50 * (1 - ks)); shred.setAttribute("opacity", cl(seg(t, 0.35, 0.55)));
        const kb = ob(seg(t, 0.55, 1.05)), p1 = oc(seg(t, 1.7, 1.88)), p2 = seg(t, 1.88, 2.35);
        tf(btn, BX, BYB, kb); btn.setAttribute("opacity", cl(seg(t, 0.55, 0.7)));
        face.setAttribute("transform", `scale(${1 - 0.1 * p1 * (1 - p2) + 0.12 * Math.sin(Math.PI * p2)})`);
        const kg = seg(t, 1.9, 2.8);
        glow.setAttribute("transform", `scale(${1 + 0.22 * oc(kg)})`); glow.setAttribute("opacity", kg > 0 && kg < 1 ? 1 - kg : 0);
        const kr = seg(t, 1.9, 2.7);
        rays.forEach((n, i) => { const a = (i / 8) * Math.PI * 2 + 0.39, d1 = 1.08 + 0.18 * oc(kr), d2 = d1 + 0.12 + 0.1 * (1 - kr); n.setAttribute("d", `M${Math.cos(a) * 118 * d1} ${Math.sin(a) * 46 * d1} L${Math.cos(a) * 118 * d2} ${Math.sin(a) * 46 * d2}`); n.setAttribute("opacity", kr > 0 && kr < 1 ? 1 - kr * kr : 0); });
      };
    },
  };

  /* ---- title card, 16 by 9 ---- */
  SC.hero = {
    w: 960, h: 540, dur: 3, pre: 3,
    build(svg) {
      const chip = el("g", {}, svg);
      el("rect", { x: 64, y: 112, width: 134, height: 42, rx: 21, fill: SKY, stroke: INK, "stroke-width": 2.5 }, chip);
      txt(chip, 131, 140, "AI tools", mono({ "font-size": 20 }));
      const title = txt(svg, 58, 272, "Duck.ai", { "font-size": 116, "font-weight": 700 });
      const ul = el("path", { stroke: YEL, "stroke-width": 14, "stroke-linecap": "round", fill: "none" }, svg);
      const line = txt(svg, 64, 356, "A free AI chat from DuckDuckGo", { "font-size": 28, "font-weight": 500, fill: MUTE });
      const chk = txt(svg, 64, 402, "Checked 26 Nov 2026", { "font-family": MONO, "font-size": 18, "font-weight": 500, fill: CAP });
      const fact = (y, col, s) => {
        const g = el("g", {}, svg);
        el("rect", { x: 556, y: y + 8, width: 360, height: 68, rx: 16, fill: SOFT }, g);
        el("rect", { x: 548, y, width: 360, height: 68, rx: 16, fill: col, stroke: INK, "stroke-width": 3 }, g);
        txt(g, 728, y + 41, s, mono({ "font-size": 20 }));
        return g;
      };
      const envG = el("g", {}, svg);
      el("rect", { x: -38, y: -22, width: 92, height: 60, rx: 8, fill: SOFT }, envG);
      el("rect", { x: -46, y: -30, width: 92, height: 60, rx: 8, fill: YEL, stroke: INK, "stroke-width": 3 }, envG);
      el("path", { d: "M-42 -26 L0 6 L42 -26", fill: "none", stroke: INK, "stroke-width": 3, "stroke-linejoin": "round", "stroke-linecap": "round" }, envG);
      const c1 = fact(168, LIL, "IP address is removed first");
      const boxG = el("g", {}, svg);
      el("rect", { x: -32, y: -6, width: 80, height: 50, rx: 8, fill: SOFT }, boxG);
      el("rect", { x: -46, y: -30, width: 92, height: 18, rx: 6, fill: YEL, stroke: INK, "stroke-width": 3 }, boxG);
      el("rect", { x: -40, y: -14, width: 80, height: 50, rx: 8, fill: BLUE, stroke: INK, "stroke-width": 3 }, boxG);
      el("circle", { cx: 0, cy: 10, r: 9, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, boxG);
      el("circle", { cx: 0, cy: 9, r: 3, fill: INK }, boxG);
      const c2 = fact(372, MINT, "Daily limit on usage");
      return (t) => {
        const a = ob(seg(t, 0.05, 0.5));
        chip.setAttribute("transform", `translate(131 133) scale(${a}) translate(-131 -133)`);
        [[title, 0.15, 30], [line, 0.3, 20], [chk, 0.42, 16]].forEach(([n, s, d]) => { const k = oc(seg(t, s, s + 0.5)); n.setAttribute("opacity", k); n.setAttribute("transform", `translate(0 ${d * (1 - k)})`); });
        ul.setAttribute("d", `M66 300 H${66 + 338 * io(seg(t, 0.5, 1.0)) + 0.01}`);
        const e = ob(seg(t, 0.7, 1.15)), b = ob(seg(t, 0.94, 1.39));
        tf(envG, 728, 120 - 30 * (1 - e)); envG.setAttribute("opacity", cl(seg(t, 0.7, 0.8)));
        tf(boxG, 728, 324 - 30 * (1 - b)); boxG.setAttribute("opacity", cl(seg(t, 0.94, 1.04)));
        [[c1, 0.82], [c2, 1.06]].forEach(([n, s]) => { const k = oc(seg(t, s, s + 0.5)); n.setAttribute("opacity", k); n.setAttribute("transform", `translate(${24 * (1 - k)} 0)`); });
      };
    },
  };

  /* ---- player: plays once in view, holds a calm final frame, tap rewinds smoothly and plays again ---- */
  const q = new URLSearchParams(location.search), frozen = q.has("mgstill"), fixed = parseFloat(q.get("mgstill"));
  const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const RW = 0.9;
  const mount = (fig) => {
    const sc = SC[fig.dataset.scene], img = fig.querySelector("img"); if (!sc || !img) return;
    const W = sc.w || 800, H = sc.h || 600, END = sc.dur;
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, class: "mg-svg", role: "group", "aria-label": img.alt || "" });
    svg.style.aspectRatio = `${W} / ${H}`;
    el("rect", { width: W, height: H, fill: "#fff" }, svg);
    img.replaceWith(svg);
    let t = calm ? END : 0, raf = 0, seen = false, last = 0, rw = null;
    let draw = () => {};
    const frame = () => draw(t, !!rw);
    const tick = (now) => {
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 0; last = now;
      if (rw) { rw.k = cl(rw.k + dt / RW); t = rw.to + (rw.from - rw.to) * (1 - io(rw.k)); if (rw.k >= 1) rw = null; }
      else if (t < END) t = Math.min(END, t + dt);
      frame();
      raf = seen && (rw || t < END) ? requestAnimationFrame(tick) : 0;
      if (!raf) last = 0;
    };
    const run = () => { if (!raf && !calm) { last = 0; raf = requestAnimationFrame(tick); } };
    const api = {
      replay: () => {
        if (frozen) return;
        if (calm) { t = t >= END ? sc.pre || 0 : END; frame(); return; }
        if (rw) return;
        rw = { from: t, to: sc.pre || 0, k: 0 }; run();
      },
    };
    draw = sc.build(svg, api);
    if (frozen) { draw(isNaN(fixed) ? END : fixed, false); return; }
    new IntersectionObserver(([e]) => {
      seen = e.isIntersecting;
      if (seen) { run(); if (!fig.dataset.sent && window.posthog) { fig.dataset.sent = 1; window.posthog.capture("blog_scene_view", { slug: location.pathname.split("/").filter(Boolean).pop(), scene: fig.dataset.scene }); } }
      else { cancelAnimationFrame(raf); raf = 0; last = 0; }
    }, { threshold: 0.25 }).observe(fig);
    svg.addEventListener("click", () => { if (!fig.dataset.hit && window.posthog) { fig.dataset.hit = 1; window.posthog.capture("blog_scene_interact", { slug: location.pathname.split("/").filter(Boolean).pop(), scene: fig.dataset.scene }); } });
    frame();
  };
  const go = () => document.querySelectorAll("figure.mg[data-scene]").forEach(mount);
  const fonts = document.fonts && document.fonts.load ? Promise.all([document.fonts.load('700 32px "Space Grotesk"'), document.fonts.load('500 20px "Space Grotesk"'), document.fonts.load('700 20px "JetBrains Mono"'), document.fonts.load('500 18px "JetBrains Mono"')]).catch(() => {}) : Promise.resolve();
  const start = () => fonts.then(go, go);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
