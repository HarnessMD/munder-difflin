/* Bright coded scenes for "AionUi alternatives". Vanilla JS, no library.
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
  const fr = (x) => ((x % 1) + 1) % 1;
  let uid = 0;
  const nid = (p) => `mg-${p}-${++uid}`;
  const button = (g, label, fn) => {
    g.setAttribute("role", "button"); g.setAttribute("tabindex", "0"); g.setAttribute("aria-label", label); g.classList.add("mg-hit");
    g.addEventListener("click", fn);
    g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); } });
  };
  const hit = (g, x, y, w, h, r) => {
    el("rect", { x, y, width: w, height: h, rx: r, fill: "#fff", "fill-opacity": 0 }, g);
    el("rect", { x, y, width: w, height: h, rx: r, fill: "none", class: "mg-ring", stroke: INK, "stroke-width": 2, "stroke-dasharray": "4 7" }, g);
  };
  const pill = (p, cx, y, w, s) => {
    el("rect", { x: cx - w / 2, y, width: w, height: 48, rx: 24, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, p);
    return txt(p, cx, y + 31, s, { "text-anchor": "middle", "font-size": 22, "font-weight": 700 });
  };

  const SC = {};

  /* ---- 1. a desk radio and a walkie talkie show the same words ---- */
  SC.walkietalkie = {
    dur: 9, still: 7.6,
    build(svg, api) {
      const defs = el("defs", {}, svg);
      const screen = (p, x, y, w, h) => {
        const id = nid("screen"), cp = el("clipPath", { id }, defs);
        el("rect", { x: x + 2, y: y + 2, width: w - 4, height: h - 4, rx: 8 }, cp);
        el("rect", { x, y, width: w, height: h, rx: 10, fill: SKY, stroke: INK, "stroke-width": 3 }, p);
        const g = el("g", { "clip-path": `url(#${id})` }, p);
        const t = txt(g, x + w / 2, y + h / 2 + 7, "Task done", { "text-anchor": "middle", "font-family": MONO, "font-size": 20, "font-weight": 700 });
        return { t, far: w / 2 + 64 };
      };
      const waves = (x, y, dir) => [0, 1, 2].map((i) => el("path", { d: `M${x + dir * (18 + i * 14)} ${y - 8 - i * 7} Q${x + dir * (27 + i * 16)} ${y} ${x + dir * (18 + i * 14)} ${y + 8 + i * 7}`, stroke: INK, "stroke-width": 3, fill: "none", "stroke-linecap": "round" }, svg));

      // the desk radio base
      const base = el("g", {}, svg);
      el("rect", { x: 100, y: 430, width: 44, height: 18, rx: 5, fill: INK }, base);
      el("rect", { x: 326, y: 430, width: 44, height: 18, rx: 5, fill: INK }, base);
      el("path", { d: "M352 252 L372 134", stroke: INK, "stroke-width": 5, "stroke-linecap": "round" }, base);
      el("circle", { cx: 372, cy: 128, r: 9, fill: YEL, stroke: INK, "stroke-width": 3 }, base);
      el("rect", { x: 70, y: 250, width: 330, height: 190, rx: 24, fill: YEL, stroke: INK, "stroke-width": 3 }, base);
      const bs = screen(base, 96, 278, 200, 62);
      const halo = el("circle", { cx: 350, cy: 309, r: 18, fill: "none", stroke: MINT, "stroke-width": 0 }, base);
      const lamp = el("circle", { cx: 350, cy: 309, r: 14, fill: MINT, stroke: INK, "stroke-width": 3 }, base);
      [370, 386, 402, 418].forEach((y) => el("path", { d: `M102 ${y} H292`, stroke: INK, "stroke-width": 4, "stroke-linecap": "round" }, base));
      el("circle", { cx: 350, cy: 396, r: 20, fill: "#fff", stroke: INK, "stroke-width": 3 }, base);
      el("path", { d: "M350 396 L350 380", stroke: INK, "stroke-width": 4, "stroke-linecap": "round" }, base);
      const bw = waves(372, 128, 1);
      pill(svg, 235, 474, 200, "Desktop app");

      // the handheld walkie talkie (the one tap target)
      const wk = el("g", {}, svg);
      hit(wk, 492, 86, 246, 382, 34);
      el("rect", { x: 650, y: 100, width: 22, height: 112, rx: 11, fill: LIL, stroke: INK, "stroke-width": 3 }, wk);
      const ptt = el("rect", { x: 506, y: 290, width: 20, height: 72, rx: 8, fill: BLUE, stroke: INK, "stroke-width": 3 }, wk);
      el("rect", { x: 520, y: 196, width: 190, height: 254, rx: 30, fill: LIL, stroke: INK, "stroke-width": 3 }, wk);
      const ws = screen(wk, 540, 226, 150, 62);
      [326, 350, 374].forEach((y) => [0, 1, 2, 3, 4].forEach((i) => el("circle", { cx: 569 + i * 23, cy: y, r: 5, fill: INK }, wk)));
      el("rect", { x: 585, y: 402, width: 60, height: 24, rx: 12, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, wk);
      const ww = waves(661, 100, -1);
      pill(svg, 615, 474, 150, "WebUI");

      // the words on their way back
      const chip = el("g", { opacity: 0 }, svg);
      el("rect", { x: -64, y: -21, width: 128, height: 42, rx: 21, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, chip);
      txt(chip, 0, 7, "Task done", { "text-anchor": "middle", "font-family": MONO, "font-size": 18, "font-weight": 700 });

      let sent = -99;
      button(wk, "Walkie talkie labelled WebUI: tap to send Task done back to the base", () => { sent = api.now(); api.seek(4.4); });

      return (t, now) => {
        const s = now - sent, on = s >= 0 && s < 2.9;
        if (!on && sent !== -99) sent = -99;
        const scroll = (far) => (t < 1 ? far : t < 3 ? far - 2 * far * seg(t, 1, 3) : t < 8.4 ? far * (1 - oc(seg(t, 3, 4.2))) : -far * io(seg(t, 8.4, 9)));
        let xb = scroll(bs.far), xw = scroll(ws.far);
        if (on) {
          xw = s < 2 ? -ws.far * io(seg(s, 0.1, 0.6)) : ws.far * (1 - oc(seg(s, 2, 2.7)));
          xb = s < 1.5 ? -bs.far * io(seg(s, 1, 1.45)) : bs.far * (1 - oc(seg(s, 1.5, 2.1)));
        }
        bs.t.setAttribute("transform", `translate(${xb} 0)`);
        ws.t.setAttribute("transform", `translate(${xw} 0)`);

        const c = on ? seg(s, 0.45, 1.55) : 0;
        if (c > 0 && c < 1) {
          const u = io(c), v = 1 - u;
          tf(chip, v * v * 615 + 2 * v * u * 405 + u * u * 196, v * v * 257 + 2 * v * u * 40 + u * u * 309, Math.min(1, c * 8, (1 - c) * 6));
          chip.setAttribute("opacity", 1);
        } else chip.setAttribute("opacity", 0);

        const lit = (t >= 0.6 && t < 8.7) || on;
        lamp.setAttribute("fill", lit ? MINT : "#fff");
        let hr = 18, hw = 0;
        if (lit) { const ph = fr((t - 0.6) * (4 / 3)); hr = 18 + 14 * ph; hw = 5 * (1 - ph); }
        if (on && s >= 1.5 && s < 2.4) { const f = seg(s, 1.5, 2.4); hr = 18 + 26 * f; hw = 7 * (1 - f); }
        halo.setAttribute("r", hr); halo.setAttribute("stroke-width", hw);

        bw.forEach((n, i) => n.setAttribute("stroke", lit && fr(t * (4 / 3) - i * 0.22) < 0.5 ? INK : SOFT));
        ww.forEach((n, i) => n.setAttribute("stroke", (on ? fr(s * 2.5 - i * 0.22) < 0.5 : lit && fr(t * (4 / 3) - 0.3 - i * 0.22) < 0.5) ? INK : SOFT));
        ptt.setAttribute("transform", `translate(${on ? 6 * Math.sin(seg(s, 0, 0.4) * Math.PI) : 0} 0)`);
      };
    },
  };

  /* ---- 2. a watering can pours along a row of seedlings ---- */
  SC.planter = {
    dur: 11.5, still: 10.4,
    build(svg, api) {
      const X = [230, 350, 470, 590], S = 420, CY = 130;
      const LEAF = "M0 0 C10 -20 38 -26 52 -16 C40 -2 16 6 0 0 Z";
      const plants = X.map((x) => {
        const g = el("g", {}, svg);
        const stem = el("path", { stroke: INK, "stroke-width": 4, "stroke-linecap": "round", fill: "none" }, g);
        const leaves = [0, 1, 2, 3].map(() => el("path", { d: LEAF, fill: MINT, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round", opacity: 0 }, g));
        const bud = el("g", {}, g);
        el("path", { d: LEAF, fill: MINT, stroke: INK, "stroke-width": 5, "stroke-linejoin": "round", transform: "rotate(-55) scale(0.42)" }, bud);
        el("path", { d: LEAF, fill: MINT, stroke: INK, "stroke-width": 5, "stroke-linejoin": "round", transform: "scale(-1 1) rotate(-55) scale(0.42)" }, bud);
        return { x, stem, leaves, bud };
      });
      el("path", { d: "M104 418 C210 400 610 400 716 418 Z", fill: MUTE, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, svg);
      X.forEach((x) => {
        el("path", { d: `M${x} 402 V414`, stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, svg);
        el("rect", { x: x - 48, y: 376, width: 96, height: 28, rx: 7, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, svg);
        txt(svg, x, 396, "Teammate", { "text-anchor": "middle", "font-size": 16, "font-weight": 700 });
      });
      // the long planter box
      [128, 656].forEach((x) => el("rect", { x, y: 514, width: 36, height: 20, rx: 4, fill: YEL, stroke: INK, "stroke-width": 3 }, svg));
      el("rect", { x: 110, y: 434, width: 600, height: 86, rx: 6, fill: YEL, stroke: INK, "stroke-width": 3 }, svg);
      [463, 491].forEach((y) => el("path", { d: `M110 ${y} H710`, stroke: INK, "stroke-width": 2 }, svg));
      el("rect", { x: 94, y: 414, width: 632, height: 22, rx: 6, fill: YEL, stroke: INK, "stroke-width": 3 }, svg);
      el("rect", { x: 310, y: 450, width: 200, height: 54, rx: 10, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, svg);
      txt(svg, 410, 485, "Same folder", { "text-anchor": "middle", "font-size": 24, "font-weight": 700 });

      // the watering can (the one tap target), drawn around the middle of its body
      const can = el("g", {}, svg);
      hit(can, -80, -108, 238, 176, 26);
      const handle = "M-40 -50 C-40 -100 34 -100 34 -50";
      el("path", { d: handle, stroke: INK, "stroke-width": 11, fill: "none", "stroke-linecap": "round" }, can);
      el("path", { d: handle, stroke: MINT, "stroke-width": 5, fill: "none", "stroke-linecap": "round" }, can);
      el("path", { d: "M56 4 L124 -52 L140 -36 L56 34 Z", fill: MINT, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, can);
      el("path", { d: "M118 -58 L146 -30", stroke: INK, "stroke-width": 7, "stroke-linecap": "round" }, can);
      el("rect", { x: -60, y: -50, width: 120, height: 100, rx: 14, fill: MINT, stroke: INK, "stroke-width": 3 }, can);
      el("rect", { x: -66, y: -58, width: 132, height: 14, rx: 7, fill: MINT, stroke: INK, "stroke-width": 3 }, can);
      el("rect", { x: -46, y: -14, width: 92, height: 34, rx: 8, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, can);
      txt(can, 0, 10, "Leader", { "text-anchor": "middle", "font-size": 22, "font-weight": 700 });

      const drops = Array.from({ length: 9 }, () => el("path", { d: "M0 -9 C5 -2 7 3 0 8 C-7 3 -5 -2 0 -9 Z", fill: SKY, stroke: INK, "stroke-width": 2, opacity: 0 }, svg));

      const canAt = (t) => {
        if (t < 0.6) return [100, 0];
        if (t < 1.2) { const k = io(seg(t, 0.6, 1.2)); return [100 - 4.5 * k, 35 * k]; }
        if (t < 7.2) return [95.5 + 360 * seg(t, 1.2, 7.2), 35];
        if (t < 8) return [455.5, 35 * (1 - io(seg(t, 7.2, 7.8)))];
        return [455.5 - 355.5 * io(seg(t, 8, 10)), 0];
      };
      const tipAt = (x, a) => { const r = (a * Math.PI) / 180, c = Math.cos(r), s = Math.sin(r); return [x + 136 * c + 40 * s, CY + 136 * s - 40 * c]; };

      let extra = 0;
      button(can, "Watering can tagged Leader: tap to tip it again", () => { extra = Math.min(extra + 1, 3); api.seek(0.6); });

      return (t) => {
        const [cx, a] = canAt(t);
        tf(can, cx, CY, 1, a);
        drops.forEach((d, k) => {
          const P = 0.55, p = fr(t / P + k / 9), te = t - p * P;
          const [ex, ea] = canAt(te);
          if (te < 0 || ea < 24) { d.setAttribute("opacity", 0); return; }
          const [x0, y0] = tipAt(ex, ea);
          tf(d, x0 + ((k % 3) - 1) * 5, y0 + 150 * (0.3 * p + 0.7 * p * p), 1 - 0.7 * seg(p, 0.7, 1));
          d.setAttribute("opacity", p < 0.97 ? 1 : 0);
        });
        plants.forEach((pl, i) => {
          const T = 1.2 + 2 * i, k = oc(seg(t, T + 0.4, T + 1.2)) * (1 - io(seg(t, 10.8, 11.5))), g = extra + k, top = S - 74 - 30 * g;
          pl.stem.setAttribute("d", `M${pl.x} ${S - 6} V${top}`);
          tf(pl.bud, pl.x, top);
          pl.leaves.forEach((lf, j) => {
            const q = cl(g - j), sc = q > 0 ? ob(q) : 0;
            lf.setAttribute("transform", `translate(${pl.x} ${S - 60 - 30 * j}) scale(${(j % 2 ? -1 : 1) * sc} ${sc})`);
            lf.setAttribute("opacity", q > 0 ? 1 : 0);
          });
        });
      };
    },
  };

  /* ---- 3. a full rowboat and a bigger boat that takes the extra cushion ---- */
  SC.rowboat = {
    dur: 10.5, still: 8,
    build(svg, api) {
      const WY = 300, DUR = 10.5;
      // the bigger boat and its label
      const bb = el("g", {}, svg);
      el("path", { d: "M-170 -56 H170 Q164 -12 140 22 Q0 38 -140 22 Q-164 -12 -170 -56 Z", fill: MINT, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, bb);
      el("path", { d: "M-176 -56 H176", stroke: INK, "stroke-width": 7, "stroke-linecap": "round" }, bb);
      [-90, -30, 30, 90].forEach((x) => el("circle", { cx: x, cy: -26, r: 9, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, bb));
      const bt = el("g", {}, svg);
      pill(bt, 0, WY + 94, 330, "Team $10 per user a month");

      // the small rowboat (the one tap target), drawn around its waterline middle
      const sb = el("g", {}, svg);
      hit(sb, -200, -124, 366, 120, 26);
      el("path", { d: "M-112 -50 L-215 20", stroke: INK, "stroke-width": 7, "stroke-linecap": "round" }, sb);
      el("path", { d: "M-135 -40 H135 Q128 -6 108 18 Q0 30 -108 18 Q-128 -6 -135 -40 Z", fill: BLUE, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, sb);
      el("path", { d: "M-140 -40 H140", stroke: INK, "stroke-width": 6, "stroke-linecap": "round" }, sb);
      const cushion = (p) => { const g = el("g", {}, p); el("rect", { x: -20, y: -12, width: 40, height: 24, rx: 9, fill: YEL, stroke: INK, "stroke-width": 2.5 }, g); el("circle", { r: 2.5, fill: INK }, g); return g; };
      const row = [0, 1, 2, 3, 4].map(() => cushion(sb));
      pill(svg, 215, WY + 94, 280, "Free $0 up to 5 users");

      // water in front of both hulls
      const water = el("g", {}, svg);
      let d = `M-60 ${WY}`;
      for (let x = -60; x < 900; x += 60) d += " q15 -8 30 0 t30 0";
      el("path", { d: `${d} V${WY + 70} H-60 Z`, fill: SKY }, water);
      el("path", { d, fill: "none", stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round" }, water);
      for (let i = 0; i < 16; i++) el("path", { d: `M${-40 + i * 60 + (i % 2) * 24} ${WY + 24 + (i % 2) * 20} h22`, stroke: "#fff", "stroke-width": 4, "stroke-linecap": "round" }, water);

      const extra = cushion(svg);
      let rocked = -99;
      button(sb, "Small rowboat: tap to rock it", () => { rocked = api.now(); api.poke(); });
      const rockAt = (u) => (u > 0 && u < 2.6 ? 9 * Math.sin(u * 6.5) * Math.exp(-1.6 * u) : 0);

      return (t, now) => {
        const s = now - rocked;
        if (s > 2.8 && rocked !== -99) rocked = -99;
        const w = (2 * Math.PI * 3) / DUR;
        water.setAttribute("transform", `translate(${-60 * fr((t / DUR) * 4)} 0)`);
        const dip = 7 * oc(seg(t, 1.7, 2.1)) * (1 - io(seg(t, 4.1, 4.7)));
        const sy = WY + Math.sin(t * w) * 3 + dip, rk = rockAt(s), sr = Math.sin(t * w + 0.6) * 0.6 + rk;
        tf(sb, 215, sy, 1, sr);
        row.forEach((c, i) => { const a = rockAt(s - 0.12 - i * 0.03); tf(c, -96 + i * 48 + a * 1.6, -52 - Math.abs(a) * 0.5); });

        const bx = 590 + 430 * (1 - oc(seg(t, 2, 4))) + 430 * io(seg(t, 9.6, 10.5));
        const by = WY + Math.sin(t * w + 1) * 3.5;
        tf(bb, bx, by, 1, Math.sin(t * w + 2) * 0.4);
        const tg = ob(seg(t, 3.7, 4.2)) * (1 - io(seg(t, 9.3, 9.6)));
        bt.setAttribute("transform", `translate(${bx} ${WY + 118}) scale(${tg}) translate(0 ${-WY - 118})`);
        bt.setAttribute("opacity", tg > 0 ? 1 : 0);

        // the sixth cushion: drops in, rides the small boat, then hops across
        const th = (sr * Math.PI) / 180, onSmall = [215 + 76 * Math.sin(th) + rockAt(s - 0.1) * 1.6, sy - 76 * Math.cos(th)];
        const onBig = [bx - 110, by - 68];
        let p = null, rot = 0;
        if (t >= 1 && t < 1.75) { const k = seg(t, 1, 1.75); p = [215, -40 + (onSmall[1] + 40) * k * k]; }
        else if (t >= 1.75 && t < 4) { p = [onSmall[0], onSmall[1] - 10 * Math.sin(Math.PI * seg(t, 1.75, 2.05))]; rot = sr; }
        else if (t >= 4 && t < 5) { const u = io(seg(t, 4, 5)); p = [onSmall[0] + (onBig[0] - onSmall[0]) * u, onSmall[1] + (onBig[1] - onSmall[1]) * u - 120 * Math.sin(Math.PI * u)]; rot = 360 * u; }
        else if (t >= 5) p = onBig;
        if (p) { tf(extra, p[0], p[1], 1, rot); extra.setAttribute("opacity", 1); } else extra.setAttribute("opacity", 0);
      };
    },
  };

  /* ---- title card, 16 by 9 ---- */
  SC.hero = {
    w: 960, h: 540, dur: 6, still: 4,
    build(svg) {
      el("rect", { x: 64, y: 52, width: 160, height: 42, rx: 21, fill: LIL, stroke: INK, "stroke-width": 2.5 }, svg);
      txt(svg, 144, 80, "Alternatives", { "text-anchor": "middle", "font-size": 19, "font-weight": 700 });
      txt(svg, 62, 176, "AionUi alternatives", { "font-size": 76, "font-weight": 700 });
      txt(svg, 64, 230, "5 apps for running teams of AI agents", { "font-size": 28, "font-weight": 500, fill: MUTE });
      txt(svg, 64, 270, "Checked 9 Nov 2026", { "font-size": 20, "font-weight": 500, fill: MUTE });
      el("rect", { x: 390, y: 312, width: 180, height: 50, rx: 12, fill: SOFT, stroke: MUTE, "stroke-width": 2.5 }, svg);
      txt(svg, 480, 344, "AionUi", { "text-anchor": "middle", "font-family": MONO, "font-size": 20, "font-weight": 700, fill: MUTE });
      el("path", { d: "M480 362 V390", stroke: MUTE, "stroke-width": 2.5, "stroke-linecap": "round" }, svg);
      const bar = el("path", { stroke: MUTE, "stroke-width": 2.5, "stroke-linecap": "round", fill: "none" }, svg);
      const names = ["Orca", "Munder Difflin", "OpenWork", "Claude Cowork", "Paperclip"], fills = [SKY, YEL, MINT, LIL, BLUE];
      const tiles = names.map((n, i) => {
        const cx = 140 + i * 170;
        const link = el("path", { d: `M${cx} 390 V420`, stroke: MUTE, "stroke-width": 2.5, "stroke-linecap": "round" }, svg);
        const g = el("g", {}, svg);
        el("rect", { x: cx - 76, y: 420, width: 152, height: 52, rx: 12, fill: fills[i], stroke: INK, "stroke-width": 2.5 }, g);
        txt(g, cx, 451, n, { "text-anchor": "middle", "font-family": MONO, "font-size": 16, "font-weight": 700 });
        return { g, link, cx };
      });
      return (t) => {
        const out = 1 - io(seg(t, 5.5, 6));
        let lo = 480, hi = 480;
        tiles.forEach(({ cx }, i) => { if (t >= 0.4 + i * 0.3 && out > 0) { lo = Math.min(lo, cx); hi = Math.max(hi, cx); } });
        bar.setAttribute("d", `M${lo} 390 H${hi}`);
        tiles.forEach(({ g, link, cx }, i) => {
          const k = seg(t, 0.4 + i * 0.3, 1 + i * 0.3), o = k > 0 && out > 0 ? 1 : 0;
          g.setAttribute("transform", `translate(${cx} ${446 + 46 * (1 - ob(k))}) scale(${out}) translate(${-cx} -446)`);
          g.setAttribute("opacity", o); link.setAttribute("opacity", o);
        });
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
