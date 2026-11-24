/* Bright coded scenes for "What is Superpowers?". Vanilla JS, no library.
   <figure class="mg" data-scene="NAME"> holds a still image; this script swaps in a live SVG.
   Plays only in view, honours reduced motion, "?mgstill" freezes each scene on its still frame. */
(() => {
  const NS = "http://www.w3.org/2000/svg";
  const INK = "#1A1320", YEL = "#FFCA54", BLUE = "#6C8EF5", LIL = "#B69CFF", MINT = "#7FD8AE", SKY = "#9AD8FF", SOFT = "#F1ECF9", MUTE = "#7A6A88";
  const SANS = '"Space Grotesk", system-ui, sans-serif', MONO = '"JetBrains Mono", ui-monospace, monospace';
  const el = (t, a = {}, p) => { const n = document.createElementNS(NS, t); for (const k in a) n.setAttribute(k, a[k]); if (p) p.appendChild(n); return n; };
  const txt = (p, x, y, s, a = {}) => { const n = el("text", Object.assign({ x, y, "font-family": SANS, "font-size": 24, "font-weight": 600, fill: INK }, a), p); n.textContent = s; return n; };
  const mono = (p, x, y, s, a = {}) => txt(p, x, y, s, Object.assign({ "font-family": MONO, "font-weight": 500 }, a));
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
  const hit = (g, a) => el("rect", Object.assign({ fill: "#fff", "fill-opacity": 0 }, a), g);
  const ring = (g, a) => el("rect", Object.assign({ fill: "none", stroke: INK, "stroke-width": 2.5, "stroke-dasharray": "6 6", class: "mg-ring" }, a), g);
  const tw = (api, now, at, d) => (api.calm ? 1 : cl((now - at) / d));
  const hint = (svg, s) => mono(svg, 756, 48, s, { "text-anchor": "end", "font-size": 18, fill: MUTE });

  /* ---- shared objects: a cape (top centre at 0,0) and a small toolchest ---- */
  const CAPE = "M-58 0 Q0 -14 58 0 L96 212 Q72 226 48 212 Q24 226 0 212 Q-24 226 -48 212 Q-72 226 -96 212 Z";
  const cape = (p, k = 1) => {
    el("path", { d: "M-58 2 Q-76 -16 -52 -32 Q-26 -14 0 -14 Q26 -14 52 -32 Q76 -16 58 2 Z", fill: YEL, stroke: INK, "stroke-width": 3 / k, "stroke-linejoin": "round" }, p);
    el("path", { d: CAPE, fill: LIL, transform: "translate(8 8)" }, p);
    el("path", { d: CAPE, fill: YEL, stroke: INK, "stroke-width": 3 / k, "stroke-linejoin": "round" }, p);
    el("path", { d: "M-24 58 Q-32 136 -42 206 M24 58 Q32 136 42 206", stroke: INK, "stroke-width": 2.5 / k, fill: "none", "stroke-linecap": "round" }, p);
    el("circle", { cy: 42, r: 9, fill: BLUE, stroke: INK, "stroke-width": 2.5 / k }, p);
  };
  const chest = (p) => {
    el("path", { d: "M-22 -36 V-46 Q-22 -54 -14 -54 H14 Q22 -54 22 -46 V-36", stroke: INK, "stroke-width": 5, fill: "none", "stroke-linecap": "round" }, p);
    el("rect", { x: -50, y: -16, width: 100, height: 60, rx: 7, fill: BLUE, stroke: INK, "stroke-width": 3 }, p);
    el("rect", { x: -54, y: -38, width: 108, height: 22, rx: 7, fill: BLUE, stroke: INK, "stroke-width": 3 }, p);
    el("path", { d: "M-50 14 H50", stroke: INK, "stroke-width": 3 }, p);
    [-5, 25].forEach((y) => el("rect", { x: -14, y, width: 28, height: 8, rx: 4, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, p));
  };

  const SC = {};

  /* ---- 1. a toolchest whose four drawers open, each lifting one skill card ---- */
  SC.toolchest = {
    dur: 9, still: 9,
    build(svg, api) {
      const DR = [["Testing", "test driven development"], ["Debugging", "systematic debugging"], ["Collaboration", "brainstorming"], ["Meta", "writing skills"]];
      hint(svg, "tap a drawer");
      el("rect", { x: 162, y: 146, width: 500, height: 440, rx: 20, fill: LIL }, svg);
      el("rect", { x: 150, y: 134, width: 500, height: 440, rx: 20, fill: YEL, stroke: INK, "stroke-width": 3 }, svg);
      const hd = "M346 96 V78 Q346 64 360 64 H440 Q454 64 454 78 V96";
      el("path", { d: hd, stroke: INK, "stroke-width": 16, fill: "none", "stroke-linecap": "round" }, svg);
      el("path", { d: hd, stroke: BLUE, "stroke-width": 10, fill: "none", "stroke-linecap": "round" }, svg);
      el("rect", { x: 146, y: 104, width: 532, height: 44, rx: 14, fill: LIL }, svg);
      el("rect", { x: 134, y: 92, width: 532, height: 44, rx: 14, fill: YEL, stroke: INK, "stroke-width": 3 }, svg);
      const user = DR.map(() => null), cur = DR.map(() => 1);
      const toggle = (i) => { user[i] = { to: cur[i] > 0.5 ? 0 : 1, at: api.now() }; api.hold(1.1); };
      const dr = DR.map(([lab, sk], i) => {
        const F = 196 + i * 106, g = el("g", {}, svg);
        hit(g, { x: 168, y: F - 52, width: 464, height: 110 });
        ring(g, { x: 168, y: F - 52, width: 464, height: 110, rx: 16 });
        const tray = el("rect", { x: 196, y: F - 14, width: 408, height: 20, rx: 6, fill: SKY, stroke: INK, "stroke-width": 2.5 }, g);
        const card = el("g", {}, g);
        el("rect", { x: 248, y: F + 3, width: 304, height: 46, rx: 9, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, card);
        mono(card, 400, F + 32, sk, { "text-anchor": "middle", "font-size": 20 });
        const front = el("g", {}, g);
        el("rect", { x: 180, y: F, width: 440, height: 50, rx: 10, fill: BLUE, stroke: INK, "stroke-width": 3 }, front);
        el("rect", { x: 198, y: F + 9, width: 190, height: 32, rx: 8, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, front);
        mono(front, 293, F + 31, lab, { "text-anchor": "middle", "font-size": 19, "font-weight": 700 });
        el("rect", { x: 500, y: F + 19, width: 92, height: 12, rx: 6, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, front);
        button(g, `${lab} drawer: ${sk}. Open or close it.`, () => toggle(i));
        return { F, tray, card, front };
      });
      const tag = el("g", {}, svg);
      el("path", { d: "M0 0 L16 -18 H158 Q166 -18 166 -10 V10 Q166 18 158 18 H16 Z", fill: LIL, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, tag);
      el("circle", { cx: 17, r: 5, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, tag);
      mono(tag, 96, 7, "15 skills", { "text-anchor": "middle", "font-size": 20, "font-weight": 700 });
      return (t, now) => {
        dr.forEach((d, i) => {
          const s = 1.2 + i * 1.25, w = (3 - i) * 0.09;
          let o, c;
          if (t < 1) { o = 1 - io(seg(t, 0.05 + w, 0.6 + w)); c = 1 - io(seg(t, w, 0.45 + w)); }
          else { o = io(seg(t, s, s + 0.5)); c = ob(seg(t, s + 0.25, s + 0.85)); }
          const u = user[i];
          if (u) {
            const k = tw(api, now, u.at, 0.9);
            if (u.to) { o = io(seg(k, 0, 0.55)); c = ob(seg(k, 0.3, 1)); }
            else { c = 1 - io(seg(k, 0, 0.5)); o = 1 - io(seg(k, 0.35, 0.9)); }
          }
          cur[i] = u ? u.to : o;
          d.tray.setAttribute("transform", `translate(0 ${14 * (1 - o)})`);
          d.card.setAttribute("transform", `translate(0 ${-47 * c})`);
          d.front.setAttribute("transform", `translate(400 ${d.F + 25 + 4 * o}) scale(${1 + 0.03 * o}) translate(-400 ${-(d.F + 25)})`);
        });
        let ty, tr, to;
        if (t < 1) { const r = io(seg(t, 0, 0.4)); ty = -60 * r; tr = -4 - 10 * r; to = 1 - r; }
        else { const k = ob(seg(t, 6.2, 6.85)); ty = -90 * (1 - k); tr = -4 + 12 * (1 - k); to = seg(t, 6.2, 6.4); }
        tag.setAttribute("transform", `translate(470 ${114 + ty}) rotate(${tr})`); tag.setAttribute("opacity", to);
      };
    },
  };

  /* ---- 2. a yellow cape floats down onto each of three hangers ---- */
  SC.cape = {
    dur: 9, still: 9,
    build(svg, api) {
      const HG = [["Claude Code", 160], ["Codex CLI", 400], ["Gemini CLI", 640]], A = 222;
      mono(svg, 400, 584, "tap a hanger", { "text-anchor": "middle", "font-size": 18, fill: MUTE });
      const capes = el("g", {}, svg);
      [34, 752].forEach((x) => {
        el("rect", { x, y: 166, width: 14, height: 372, fill: BLUE, stroke: INK, "stroke-width": 2.5 }, svg);
        el("rect", { x: x - 20, y: 532, width: 54, height: 14, rx: 7, fill: BLUE, stroke: INK, "stroke-width": 2.5 }, svg);
      });
      el("rect", { x: 22, y: 158, width: 756, height: 16, rx: 8, fill: BLUE, stroke: INK, "stroke-width": 3 }, svg);
      const sign = el("g", {}, svg);
      [250, 550].forEach((x) => { el("path", { d: `M${x} 126 V158`, stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, sign); el("circle", { cx: x, cy: 165, r: 9, fill: "none", stroke: INK, "stroke-width": 3 }, sign); });
      el("rect", { x: 153, y: 84, width: 510, height: 50, rx: 12, fill: LIL }, sign);
      el("rect", { x: 145, y: 76, width: 510, height: 50, rx: 12, fill: SKY, stroke: INK, "stroke-width": 3 }, sign);
      const FS = 18, ADV = FS * 0.6, line = "install Superpowers separately for each one", X0 = 400 - (line.length * ADV) / 2;
      let ci = 0;
      const ws = line.split(" ").map((w) => { const n = mono(sign, X0 + ci * ADV, 107, w, { "font-size": FS }); ci += w.length + 1; return n; });
      const drops = HG.map(() => -99);
      const drop = (i) => { drops[i] = api.now(); api.hold(2.2); };
      const fall = (e) => ({ y: -560 * (1 - oc(e)), x: 22 * Math.sin(e * 7) * (1 - e), r: 9 * Math.sin(e * 6 + 1) * (1 - e), o: seg(e, 0, 0.12) });
      const lift = (r) => ({ y: -560 * r, x: 0, r: -6 * r, o: 1 - seg(r, 0.7, 1) });
      const hs = HG.map(([lab, x], i) => {
        const g = el("g", {}, svg);
        hit(g, { x: x - 114, y: 140, width: 228, height: 372 });
        ring(g, { x: x - 114, y: 140, width: 228, height: 372, rx: 22 });
        const cg = el("g", {}, capes); cape(cg);
        const hk = el("g", {}, g); tf(hk, x, A);
        el("path", { d: "M0 2 V-44 C0 -80 34 -84 34 -60 V-52", stroke: INK, "stroke-width": 5, fill: "none", "stroke-linecap": "round" }, hk);
        el("path", { d: "M-84 56 L0 4 L84 56 Z", stroke: INK, "stroke-width": 14, fill: "none", "stroke-linejoin": "round" }, hk);
        el("path", { d: "M-84 56 L0 4 L84 56 Z", stroke: SOFT, "stroke-width": 8, fill: "none", "stroke-linejoin": "round" }, hk);
        el("rect", { x: -78, y: 42, width: 156, height: 32, rx: 10, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, hk);
        mono(hk, 0, 64, lab, { "text-anchor": "middle", "font-size": 18, "font-weight": 700 });
        button(g, `${lab} hanger: drop its cape again`, () => drop(i));
        return { cg, x };
      });
      return (t, now) => {
        hs.forEach((h, i) => {
          const s = 1 + i * 1.55;
          let st;
          if (t < 1) st = lift(io(seg(t, 0.05 + i * 0.08, 0.7 + i * 0.08)));
          else { st = fall(seg(t, s, s + 1.3)); st.y += 8 * Math.sin(seg(t, s + 1.3, s + 1.65) * Math.PI); }
          const d = now - drops[i];
          if (!api.calm && d >= 0 && d < 2.2) {
            if (d < 0.35) st = lift(io(d / 0.35));
            else { st = fall(seg(d, 0.35, 1.65)); st.y += 8 * Math.sin(seg(d, 1.65, 2) * Math.PI); }
          }
          tf(h.cg, h.x + st.x, A + 44 + st.y, 1, st.r); h.cg.setAttribute("opacity", st.o);
        });
        let sy, sr, so;
        if (t < 1) { const r = io(seg(t, 0, 0.5)); sy = -170 * r; sr = 0; so = 1 - seg(r, 0.6, 1); }
        else { const k = ob(seg(t, 5.8, 6.5)), w = seg(t, 6.3, 7.4); sy = -170 * (1 - k); sr = 3.5 * Math.sin(w * Math.PI * 3) * (1 - w); so = seg(t, 5.8, 5.95); }
        sign.setAttribute("transform", `translate(0 ${sy}) rotate(${sr} 400 166)`); sign.setAttribute("opacity", so);
        ws.forEach((w, j) => { const k = t < 1 ? 1 : oc(seg(t, 6.35 + j * 0.09, 6.65 + j * 0.09)); w.setAttribute("opacity", k); w.setAttribute("transform", `translate(0 ${8 * (1 - k)})`); });
      };
    },
  };

  /* ---- 3. a seven lamp traffic light, one lamp lit at a time ---- */
  SC.trafficlight = {
    dur: 9, still: 9,
    build(svg, api) {
      const L = ["brainstorming", "worktree", "plan", "subagents", "tests", "review", "finish"];
      const X = 330, Y0 = 100, P = 62, ly = (f) => Y0 + f * P, at = (j) => 0.9 + j * 0.92;
      const tip = hint(svg, "tap the light");
      const g = el("g", {}, svg);
      hit(g, { x: 266, y: 42, width: 128, height: 546 });
      ring(g, { x: 266, y: 42, width: 128, height: 546, rx: 30 });
      el("rect", { x: 296, y: 68, width: 92, height: 460, rx: 30, fill: LIL }, g);
      el("rect", { x: 316, y: 510, width: 28, height: 54, fill: BLUE, stroke: INK, "stroke-width": 3 }, g);
      el("rect", { x: 284, y: 558, width: 92, height: 18, rx: 9, fill: BLUE, stroke: INK, "stroke-width": 3 }, g);
      el("rect", { x: 284, y: 56, width: 92, height: 460, rx: 30, fill: BLUE, stroke: INK, "stroke-width": 3 }, g);
      const lamps = L.map((s, i) => {
        const lg = el("g", {}, g), rays = el("g", {}, lg);
        [[INK, 7], [MINT, 3.5]].forEach(([c, w]) => { for (let k = 0; k < 8; k++) { const a = (k * Math.PI) / 4, x = Math.cos(a), y = Math.sin(a); el("path", { d: `M${28 * x} ${28 * y} L${35 * x} ${35 * y}`, stroke: c, "stroke-width": w, "stroke-linecap": "round" }, rays); } });
        const bulb = el("circle", { r: 21, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, lg);
        const lab = mono(svg, 410, ly(i) + 8, s, { "font-size": 22 });
        return { lg, rays, bulb, lab };
      });
      const AR = "M0 0 L-30 -24 V-11 H-84 V11 H-30 V24 Z", arrow = el("g", {}, svg);
      el("path", { d: AR, fill: LIL, transform: "translate(5 5)" }, arrow);
      el("path", { d: AR, fill: YEL, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, arrow);
      let user = null, curF = 6, curLit = 6;
      const step = () => { const b = user ? user.to : curLit >= 0 ? curLit : Math.round(curF); user = { from: curF, to: (b + 1) % 7, at: api.now() }; api.hold(1.3); };
      button(g, "Traffic light: step to the next lamp", step);
      return (t, now) => {
        let f, lit, pop = 99, inkUpTo = 6, tipK = 1;
        if (user) {
          const d = user.to === 0 ? 0.8 : 0.45, k = tw(api, now, user.at, d);
          f = user.from + (user.to - user.from) * (user.to === 0 ? io(k) : ob(k));
          lit = k >= 1 ? user.to : -1; pop = api.calm ? 99 : now - user.at - d;
        } else if (t < 0.9) {
          f = 6 - 6 * io(seg(t, 0.1, 0.9)); lit = t < 0.1 ? 6 : -1;
          inkUpTo = -1; tipK = 1 - seg(t, 0, 0.3);
        } else {
          let j = 0; for (let m = 1; m < 7; m++) if (t >= at(m) - 0.42) j = m;
          f = j ? j - 1 + ob(seg(t, at(j) - 0.42, at(j))) : 0;
          lit = t >= at(j) ? j : -1; pop = t - at(j); inkUpTo = lit >= 0 ? j : j - 1;
          tipK = t < 6.9 ? 0 : ob(seg(t, 6.9, 7.4));
        }
        curF = f; curLit = lit;
        lamps.forEach((l, i) => {
          const on = i === lit, b = on ? Math.sin(seg(pop, 0, 0.4) * Math.PI) : 0;
          l.bulb.setAttribute("fill", on ? MINT : SOFT);
          l.rays.setAttribute("opacity", on ? oc(seg(pop, 0, 0.25)) : 0);
          tf(l.lg, X, ly(i), 1 + 0.15 * b);
          let ink = i <= inkUpTo;
          if (!user && t < 0.9) ink = seg(t, 0.1 + (6 - i) * 0.08, 0.3 + (6 - i) * 0.08) < 0.5;
          l.lab.setAttribute("fill", ink ? INK : MUTE);
          l.lab.setAttribute("font-weight", on ? 700 : 500);
          l.lab.setAttribute("transform", `translate(${on ? 10 * (1 - oc(seg(pop, 0, 0.35))) : 0} 0)`);
        });
        tf(arrow, 256, ly(f));
        tip.setAttribute("opacity", cl(tipK * 1.5)); tip.setAttribute("transform", `translate(0 ${14 * (1 - tipK)})`);
      };
    },
  };

  /* ---- title card, 16 by 9 ---- */
  SC.hero = {
    w: 960, h: 540, dur: 6, still: 6,
    build(svg) {
      const pill = el("g", {}, svg);
      el("rect", { x: 56, y: 44, width: 156, height: 46, rx: 23, fill: YEL, stroke: INK, "stroke-width": 2.5 }, pill);
      mono(pill, 134, 74, "Explainer", { "text-anchor": "middle", "font-size": 21, "font-weight": 700 });
      const chk = mono(svg, 904, 74, "Checked 24 Nov 2026", { "text-anchor": "end", "font-size": 20, fill: MUTE });
      const title = txt(svg, 56, 196, "What is Superpowers?", { "font-size": 74, "font-weight": 700 });
      const ul = el("path", { d: "M60 228 H280", stroke: YEL, "stroke-width": 14, "stroke-linecap": "round" }, svg);
      const sub = txt(svg, 56, 282, "The skills library for coding agents", { "font-size": 28, "font-weight": 500, fill: MUTE });
      const tile = (x, fill, label, icon) => {
        const g = el("g", {}, svg);
        el("rect", { x, y: 320, width: 408, height: 176, rx: 22, fill, stroke: INK, "stroke-width": 2.5 }, g);
        const ic = el("g", {}, g); icon(ic);
        const lb = mono(g, x + 204, 470, label, { "text-anchor": "middle", "font-size": 30, "font-weight": 700 });
        return { g, ic, lb, x };
      };
      const T = [tile(56, LIL, "MIT licence", (p) => cape(el("g", { transform: "scale(0.38)" }, p), 0.38)), tile(496, SKY, "15 skills", (p) => chest(el("g", { transform: "scale(0.9)" }, p)))];
      const icy = [352, 392];
      return (t) => {
        const up = (n, a, b, d = 18) => { const k = ob(seg(t, a, b)); n.setAttribute("opacity", seg(t, a, a + 0.15)); n.setAttribute("transform", `translate(0 ${d * (1 - k)})`); };
        up(pill, 0.2, 0.65); up(chk, 0.32, 0.77, 10); up(title, 0.44, 1.0, 24); up(sub, 0.95, 1.4, 12);
        ul.setAttribute("d", `M60 228 H${60 + 220 * oc(seg(t, 0.8, 1.3))}`); ul.setAttribute("opacity", t >= 0.8 ? 1 : 0);
        T.forEach((s, i) => {
          up(s.g, 1.3 + i * 0.1, 1.8 + i * 0.1, 26);
          const k = ob(seg(t, 1.8 + i * 0.1, 2.3 + i * 0.1));
          s.ic.setAttribute("transform", `translate(${s.x + 204} ${icy[i] - 30 * (1 - k)})`); s.ic.setAttribute("opacity", seg(t, 1.8 + i * 0.1, 1.95 + i * 0.1));
          const m = oc(seg(t, 2.3 + i * 0.1, 2.7 + i * 0.1));
          s.lb.setAttribute("opacity", m); s.lb.setAttribute("transform", `translate(0 ${10 * (1 - m)})`);
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
    let raf = 0, seen = false, held = calm, busy = 0;
    const base = performance.now(), clock = () => (performance.now() - base) / 1000;
    let draw = () => {};
    const frame = () => { const now = clock(); draw(held ? sc.still : now % sc.dur, now); };
    const tick = () => { cancelAnimationFrame(raf); frame(); if (seen && !calm && (!held || clock() < busy)) raf = requestAnimationFrame(tick); };
    const api = { calm, now: clock, hold: (s) => { held = true; busy = clock() + s; tick(); } };
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
  const fonts = document.fonts && document.fonts.load ? Promise.all([document.fonts.load('700 32px "Space Grotesk"'), document.fonts.load('500 20px "Space Grotesk"'), document.fonts.load('700 20px "JetBrains Mono"'), document.fonts.load('500 20px "JetBrains Mono"')]).catch(() => {}) : Promise.resolve();
  const start = () => fonts.then(go, go);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
