/* Bright coded scenes for "GitHub Copilot CLI alternatives". Vanilla JS, no library.
   <figure class="mg" data-scene="NAME"> holds a still image; this script swaps in a live SVG.
   Plays only in view, honours reduced motion, "?mgstill" freezes each scene on its still frame. */
(() => {
  const NS = "http://www.w3.org/2000/svg";
  const INK = "#1A1320", YEL = "#FFCA54", BLUE = "#6C8EF5", LIL = "#B69CFF", MINT = "#7FD8AE", SKY = "#9AD8FF", SOFT = "#F1ECF9", MUTE = "#7A6A88", WHITE = "#fff";
  const SANS = '"Space Grotesk", system-ui, sans-serif', MONO = '"JetBrains Mono", ui-monospace, monospace';
  let uid = 0;
  const el = (t, a = {}, p) => { const n = document.createElementNS(NS, t); for (const k in a) n.setAttribute(k, a[k]); if (p) p.appendChild(n); return n; };
  const txt = (p, x, y, s, a = {}) => { const n = el("text", Object.assign({ x, y, "font-family": SANS, "font-size": 24, "font-weight": 600, fill: INK }, a), p); n.textContent = s; return n; };
  const mono = (p, x, y, s, size, a = {}) => txt(p, x, y, s, Object.assign({ "font-family": MONO, "font-size": size, "font-weight": 700 }, a));
  const cl = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const seg = (t, a, b) => cl((t - a) / (b - a));
  const lerp = (a, b, k) => a + (b - a) * k;
  const oc = (x) => 1 - Math.pow(1 - x, 3);
  const ob = (x) => { const c = 1.70158; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
  const io = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const ramp = (u) => u * u * u - (u * u * u * u) / 2; // distance covered while speed eases in with smoothstep
  const tf = (n, x, y, s = 1, r = 0) => n.setAttribute("transform", `translate(${x} ${y}) rotate(${r}) scale(${s})`);
  const op = (n, v) => n.setAttribute("opacity", cl(v));
  const tw = (n, fb) => { try { const w = n.getComputedTextLength(); return w > 0 ? w : fb; } catch (e) { return fb; } };
  const ring = (p, a) => el(a.r ? "circle" : "rect", Object.assign({ fill: WHITE, "fill-opacity": 0, stroke: INK, "stroke-width": 2.5, "stroke-dasharray": "6 8", class: "mg-ring" }, a), p);
  const button = (g, label, fn) => {
    g.setAttribute("role", "button"); g.setAttribute("tabindex", "0"); g.setAttribute("aria-label", label); g.classList.add("mg-hit");
    g.addEventListener("click", fn);
    g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); } });
  };

  /* ---- three tools, each drawn standing on its base at 0,0 ---- */
  const wrench = (g) => {
    el("rect", { x: -10, y: -114, width: 20, height: 96, rx: 7, fill: YEL, stroke: INK, "stroke-width": 3 }, g);
    el("path", { d: "M-9 -152.25 L-9 -134 L9 -134 L9 -152.25 A24 24 0 1 1 -9 -152.25 Z", fill: YEL, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, g);
    el("circle", { cx: 0, cy: -17, r: 16, fill: YEL, stroke: INK, "stroke-width": 3 }, g);
    el("circle", { cx: 0, cy: -17, r: 6, fill: WHITE, stroke: INK, "stroke-width": 2.5 }, g);
  };
  const driver = (g) => {
    el("rect", { x: -4.5, y: -132, width: 9, height: 60, fill: WHITE, stroke: INK, "stroke-width": 2.5 }, g);
    el("path", { d: "M-4.5 -128 L-7.5 -150 H7.5 L4.5 -128 Z", fill: WHITE, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, g);
    el("rect", { x: -10, y: -78, width: 20, height: 16, rx: 4, fill: WHITE, stroke: INK, "stroke-width": 2.5 }, g);
    el("rect", { x: -18, y: -66, width: 36, height: 66, rx: 15, fill: MINT, stroke: INK, "stroke-width": 3 }, g);
    el("path", { d: "M-7 -52 V-14 M0 -52 V-14 M7 -52 V-14", stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round" }, g);
  };
  const hammer = (g) => {
    el("rect", { x: -8, y: -128, width: 16, height: 128, rx: 7, fill: BLUE, stroke: INK, "stroke-width": 3 }, g);
    el("path", { d: "M-8 -44 H8 M-8 -34 H8", stroke: INK, "stroke-width": 2.5 }, g);
    el("path", { d: "M-50 -142 Q-34 -152 -16 -152 H26 V-122 H-16 Q-30 -122 -50 -132 Z", fill: BLUE, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, g);
    el("rect", { x: 22, y: -156, width: 20, height: 38, rx: 5, fill: BLUE, stroke: INK, "stroke-width": 3 }, g);
  };

  const SC = {};

  /* ---- 1. the Copilot CLI toolbox opens and its tray of tools rises ---- */
  SC.toolbox = {
    dur: 7.4, still: 7.4,
    build(svg, api) {
      const ground = el("ellipse", { cx: 400, cy: 550, rx: 236, ry: 14, fill: SOFT }, svg);
      const box = el("g", {}, svg);
      ring(box, { x: 166, y: 262, width: 468, height: 284, rx: 28 });
      const mouth = el("path", { d: "M190 350 L214 330 H634 L610 350 Z", fill: SOFT, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, box);
      const lid = el("path", { fill: SKY, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, box);
      const lidIn = el("path", { fill: SOFT, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, box);
      const handle = el("path", { fill: "none", stroke: INK, "stroke-width": 9, "stroke-linecap": "round" }, box);
      const tray = el("g", {}, box);
      el("path", { d: "M244 26 V64 M556 26 V64", stroke: INK, "stroke-width": 4, "stroke-linecap": "round" }, tray);
      el("rect", { x: 212, y: 0, width: 376, height: 26, rx: 9, fill: LIL, stroke: INK, "stroke-width": 3 }, tray);
      const TOOLS = [[260, -4, "Issues", wrench], [400, 0, "Pull requests", driver], [540, 4, "MCP server", hammer]], CHIPX = [252, 400, 548];
      const tools = TOOLS.map((d) => { const g = el("g", {}, box); d[3](g); return g; });
      const front = el("g", {}, box);
      el("rect", { x: 190, y: 350, width: 420, height: 180, rx: 18, fill: SKY, stroke: INK, "stroke-width": 3 }, front);
      [232, 538].forEach((x) => el("rect", { x, y: 338, width: 30, height: 30, rx: 7, fill: WHITE, stroke: INK, "stroke-width": 2.5 }, front));
      const plate = el("rect", { y: 414, height: 60, rx: 14, fill: WHITE, stroke: INK, "stroke-width": 2.5 }, front);
      const pw = tw(mono(front, 400, 455, "Copilot CLI", 30, { "text-anchor": "middle" }), 198) + 52;
      plate.setAttribute("x", 400 - pw / 2); plate.setAttribute("width", pw);
      const chips = TOOLS.map(([, , s], i) => {
        const x = CHIPX[i], g = el("g", {}, svg), r = el("rect", { y: 66, height: 36, rx: 18, fill: WHITE, stroke: INK, "stroke-width": 2.5 }, g);
        const w = tw(mono(g, x, 89.5, s, 16, { "text-anchor": "middle" }), s.length * 9.6) + 26;
        r.setAttribute("x", x - w / 2); r.setAttribute("width", w); return g;
      });
      const C0 = [[184, 312], [616, 312], [616, 352], [184, 352]], C1 = [[214, 118], [634, 118], [634, 330], [214, 330]], IN = [[10, 12], [-10, 12], [-10, -12], [10, -12]];
      const quad = (P) => `M${P[0][0]} ${P[0][1]} L${P[1][0]} ${P[1][1]} L${P[2][0]} ${P[2][1]} L${P[3][0]} ${P[3][1]} Z`;
      const render = (t) => {
        const drop = ob(seg(t, 0, 0.8)), lk = ob(seg(t, 1.0, 2.1)), trk = ob(seg(t, 2.0, 3.0));
        box.setAttribute("transform", `translate(0 ${-80 * (1 - drop)})`); op(box, seg(t, 0, 0.2));
        ground.setAttribute("rx", 236 * (0.55 + 0.45 * cl(drop, 0, 1.1))); op(ground, seg(t, 0, 0.5));
        const P = C0.map((p, j) => [lerp(p[0], C1[j][0], lk), lerp(p[1], C1[j][1], lk)]);
        lid.setAttribute("d", quad(P));
        lidIn.setAttribute("d", quad(P.map((p, j) => [p[0] + IN[j][0], p[1] + IN[j][1]]))); op(lidIn, seg(lk, 0.35, 0.8));
        op(mouth, seg(lk, 0.05, 0.3));
        const hk = cl(1 - lk * 2.2), mx = (P[0][0] + P[1][0]) / 2, ty = P[0][1], h = 34 * hk * 1.33;
        handle.setAttribute("d", `M${mx - 64} ${ty} C${mx - 64} ${ty - h} ${mx + 64} ${ty - h} ${mx + 64} ${ty}`); op(handle, hk > 0.03 ? 1 : 0);
        const ty2 = lerp(352, 296, trk); tray.setAttribute("transform", `translate(0 ${ty2})`);
        tools.forEach((g, i) => { const k = ob(seg(t, 2.7 + 0.12 * i, 3.4 + 0.12 * i)); tf(g, TOOLS[i][0], ty2 + 4 + 30 * (1 - k), 0.7 + 0.3 * k, TOOLS[i][1]); op(g, k * 4); });
        chips.forEach((g, i) => { const k = ob(seg(t, 3.9 + 0.12 * i, 4.45 + 0.12 * i)); g.setAttribute("transform", `translate(0 ${-16 * (1 - k)})`); op(g, k * 2); });
      };
      let rev = null, last = 0;
      button(box, "Copilot CLI toolbox: close the lid and open it again", () => {
        if (api.calm || rev) return;
        const from = Math.min(last, 4.8);
        if (from <= 1.0) { api.seek(1.0); return; }
        rev = { n: api.now(), from }; api.keep(1.5);
      });
      return (t, now) => {
        let te = t;
        if (rev) { const r = (now - rev.n) / 1.1; if (r >= 1.15) { rev = null; api.seek(1.0); te = 1.0; } else te = lerp(rev.from, 1.0, io(cl(r))); }
        last = te; render(te);
      };
    },
  };

  /* ---- 2. a juicer fills four plan glasses to their monthly total credits ---- */
  SC.juicer = {
    dur: 9.2, still: 9.2,
    build(svg, api) {
      const GX = [104, 284, 464, 648], GT = 296, GB = 526, IB = 524, JY = 214, SP = JY + 66;
      const LV = [7, 16, 75, 213], TAG = ["", "$15", "$70", "$200"], NAME = ["Free", "Pro", "Pro+", "Max"];
      const P = [1.5, 2.8, 4.2, 5.9], D = [0.35, 0.45, 0.75, 1.15];
      const hwo = (y) => lerp(44, 52, (GB - y) / (GB - GT));
      const defs = el("defs", {}, svg);
      const sign = el("g", {}, svg);
      const sh = el("rect", { y: 24, height: 46, rx: 14, fill: LIL }, sign);
      const sb = el("rect", { y: 18, height: 46, rx: 14, fill: MINT, stroke: INK, "stroke-width": 3 }, sign);
      const sl = txt(sign, 400, 50, "Monthly total credits", { "text-anchor": "middle", "font-size": 25, "font-weight": 700 });
      const sw = tw(sl, 300) + 56;
      sb.setAttribute("x", 400 - sw / 2); sb.setAttribute("width", sw); sh.setAttribute("x", 406 - sw / 2); sh.setAttribute("width", sw);
      const G = GX.map((x, i) => {
        const g = el("g", {}, svg), id = `mgjuice${++uid}`;
        const shape = `M${x - 52} ${GT} L${x - 44} ${GB - 8} Q${x - 44} ${GB} ${x - 36} ${GB} H${x + 36} Q${x + 44} ${GB} ${x + 44} ${GB - 8} L${x + 52} ${GT}`;
        el("path", { d: shape + " Z" }, el("clipPath", { id }, defs));
        el("path", { d: shape + " Z", fill: SOFT }, g);
        const jg = el("g", { "clip-path": `url(#${id})` }, g);
        const juice = el("path", { fill: YEL }, jg), surf = el("path", { fill: "none", stroke: INK, "stroke-width": 2.5 }, jg);
        el("path", { d: `M${x - 33} ${GT + 24} L${x - 29} ${GB - 34}`, stroke: WHITE, "stroke-width": 6, "stroke-linecap": "round" }, g);
        el("path", { d: shape, fill: "none", stroke: INK, "stroke-width": 3, "stroke-linejoin": "round", "stroke-linecap": "round" }, g);
        mono(g, x, 566, NAME[i], 19, { "text-anchor": "middle" });
        let tag = null;
        if (TAG[i]) {
          const yL = IB - LV[i], x0 = x + hwo(yL) + 6;
          tag = el("g", {}, svg);
          el("path", { d: `M${x0} ${yL} L${x0 + 13} ${yL - 16} H${x0 + 68} Q${x0 + 74} ${yL - 16} ${x0 + 74} ${yL - 10} V${yL + 10} Q${x0 + 74} ${yL + 16} ${x0 + 68} ${yL + 16} H${x0 + 13} Z`, fill: SKY, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, tag);
          el("circle", { cx: x0 + 19, cy: yL, r: 3.5, fill: WHITE, stroke: INK, "stroke-width": 2 }, tag);
          mono(tag, x0 + 47, yL + 5.5, TAG[i], 16, { "text-anchor": "middle" });
          tag.ax = x0; tag.ay = yL;
        }
        return { g, juice, surf, tag, x };
      });
      const stream = el("rect", { width: 9, rx: 4.5, fill: YEL, stroke: INK, "stroke-width": 2, opacity: 0 }, svg);
      const J = el("g", {}, svg);
      ring(J, { x: -100, y: -146, width: 188, height: 226, rx: 28 });
      el("rect", { x: 58, y: -86, width: 14, height: 92, rx: 5, fill: LIL, stroke: INK, "stroke-width": 3 }, J);
      el("path", { d: "M-12 50 H12 L6 66 H-6 Z", fill: LIL, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, J);
      el("path", { d: "M-56 2 H56 L36 54 H-36 Z", fill: LIL, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, J);
      const lemon = el("g", {}, J);
      el("path", { d: "M-52 -25 Q-46 -50 0 -50 Q46 -50 52 -25 Q46 0 0 0 Q-46 0 -52 -25 Z", fill: YEL, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, lemon);
      el("path", { d: "M-26 -35 Q-14 -42 2 -42", fill: "none", stroke: WHITE, "stroke-width": 5, "stroke-linecap": "round" }, lemon);
      el("rect", { x: -62, y: -4, width: 124, height: 12, rx: 6, fill: LIL, stroke: INK, "stroke-width": 3 }, J);
      const arm = el("g", {}, J);
      el("path", { d: "M-30 -72 Q-30 -44 0 -44 Q30 -44 30 -72 Z", fill: LIL, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, arm);
      el("rect", { x: -84, y: -88, width: 160, height: 16, rx: 8, fill: LIL, stroke: INK, "stroke-width": 3 }, arm);
      el("circle", { cx: -86, cy: -80, r: 11, fill: WHITE, stroke: INK, "stroke-width": 3 }, arm);
      el("circle", { cx: 65, cy: -80, r: 4.5, fill: WHITE, stroke: INK, "stroke-width": 2.5 }, arm);
      const state = (t) => {
        let jx = lerp(-160, GX[0], oc(seg(t, 0.7, 1.4)));
        for (let i = 0; i < 3; i++) { const a = P[i] + D[i] + 0.4; jx = lerp(jx, GX[i + 1], io(seg(t, a, a + 0.55))); }
        const s = { jx, pr: 0, lv: [], tg: [], on: [], off: [], w: t };
        for (let i = 0; i < 4; i++) {
          const e = P[i] + 0.2 + D[i];
          s.pr = Math.max(s.pr, io(seg(t, P[i], P[i] + 0.3)) * (1 - io(seg(t, e, e + 0.3))));
          s.lv.push(LV[i] * oc(seg(t, P[i] + 0.2, e)));
          s.tg.push(ob(seg(t, e - 0.05, e + 0.4)));
          s.on.push(oc(seg(t, P[i] + 0.1, P[i] + 0.24)));
          s.off.push(oc(seg(t, e, e + 0.14)));
        }
        return s;
      };
      const render = (s, t) => {
        const sk = ob(seg(t, 0, 0.6)); sign.setAttribute("transform", `translate(0 ${-80 * (1 - sk)})`); op(sign, sk * 3); op(sl, oc(seg(t, 0.35, 0.75)));
        G.forEach((g, i) => {
          const k = ob(seg(t, 0.25 + 0.09 * i, 0.8 + 0.09 * i)); g.g.setAttribute("transform", `translate(0 ${60 * (1 - k)})`); op(g.g, k * 3);
          const L = s.lv[i], yS = IB - L, x = g.x;
          if (L < 0.4) { g.juice.setAttribute("d", ""); g.surf.setAttribute("d", ""); }
          else {
            const amp = 2.4 * s.on[i] * (1 - s.off[i]);
            let top = "";
            for (let j = 0; j <= 12; j++) top += ` L${(x - 60 + 10 * j).toFixed(1)} ${(yS + amp * Math.sin(j * 1.25 + s.w * 11)).toFixed(1)}`;
            g.juice.setAttribute("d", `M${x - 60} 540${top} L${x + 60} 540 Z`);
            g.surf.setAttribute("d", "M" + top.slice(2));
          }
          if (g.tag) { const k2 = s.tg[i], ax = g.tag.ax, ay = g.tag.ay; g.tag.setAttribute("transform", `translate(${ax} ${ay}) scale(${Math.max(0.001, k2)}) translate(${-ax} ${-ay})`); op(g.tag, k2 * 3); }
        });
        let act = -1;
        for (let i = 0; i < 4; i++) if (s.on[i] > 0 && s.off[i] < 1) act = i;
        if (act < 0) op(stream, 0);
        else {
          const yS = IB - s.lv[act], top = lerp(SP, yS, s.off[act]), bot = lerp(SP, yS, s.on[act]);
          stream.setAttribute("x", s.jx - 4.5); stream.setAttribute("y", top - 2); stream.setAttribute("height", Math.max(0, bot - top + 2)); op(stream, bot - top > 1 ? 1 : 0);
        }
        tf(J, s.jx, JY);
        arm.setAttribute("transform", `rotate(${lerp(16, -4, s.pr)} 65 -80)`);
        lemon.setAttribute("transform", `scale(${1 + 0.08 * s.pr} ${1 - 0.26 * s.pr})`);
      };
      const T0 = P[0] - 0.2, S0 = state(T0);
      let rs = null, last = S0;
      button(J, "Lilac juicer: pour again", () => {
        if (api.calm || rs) return;
        rs = { n: api.now(), from: last }; api.keep(1.3);
      });
      return (t, now) => {
        let s = state(t);
        if (rs) {
          const r = (now - rs.n) / 0.9;
          if (r >= 1) { rs = null; api.seek(T0); t = T0; s = state(T0); }
          else { const k = io(r), a = rs.from; s = { jx: lerp(a.jx, S0.jx, k), pr: lerp(a.pr, 0, k), lv: a.lv.map((v) => lerp(v, 0, k)), tg: a.tg.map((v) => lerp(v, 0, k)), on: a.on, off: a.off.map((v) => lerp(v, 1, k)), w: a.w }; }
        }
        last = s; render(s, t);
      };
    },
  };

  /* ---- 3. gondola cabins on a cable; tap one to see the matching pick ---- */
  SC.gondola = {
    dur: 9.6, still: 9.6,
    build(svg, api) {
      const CAB = [["Claude", "plan"], ["Team of", "agents"], ["ChatGPT", "plan"], ["Any", "model"], ["Qwen", "models"]];
      const PICK = ["Claude Code", "Munder Difflin", "Codex CLI", "OpenCode", "Qwen Code"];
      const SCL = 1.12, CY = 448;
      const cy = (x) => 132 + 50 * (1 - ((x - 400) / 560) ** 2);
      const wrap = (x) => ((((x + 80) % 800) + 800) % 800) - 80;
      const at = (i, o) => wrap(80 + 160 * i + o);
      const vis = (x) => (x < 0 ? x + 800 : x);
      const clouds = [[150, 70, 1], [600, 56, 0.8]].map(([x, y, s]) => {
        const g = el("g", {}, svg);
        el("path", { d: "M-60 18 Q-62 -6 -36 -8 Q-30 -34 -2 -30 Q20 -46 40 -24 Q66 -24 64 0 Q70 18 50 18 Z", fill: SOFT }, g);
        return { g, x, y, s };
      });
      let d = "";
      for (let x = -20; x <= 820; x += 20) d += `${d ? " L" : "M"}${x} ${cy(x).toFixed(1)}`;
      const cA = el("path", { d, fill: "none", stroke: INK, "stroke-width": 12, "stroke-linecap": "round", pathLength: 1, "stroke-dasharray": "1 1" }, svg);
      const cB = el("path", { d, fill: "none", stroke: BLUE, "stroke-width": 6, "stroke-linecap": "round", pathLength: 1, "stroke-dasharray": "1 1" }, svg);
      let tapCabin = () => {}, tapCard = () => {};
      const mkCab = (i, ghost) => {
        const g = el("g", ghost ? { "aria-hidden": "true" } : {}, svg);
        if (ghost) el("rect", { x: -72, y: -12, width: 144, height: 198, rx: 28, fill: WHITE, "fill-opacity": 0 }, g);
        else ring(g, { x: -72, y: -12, width: 144, height: 198, rx: 28 });
        el("path", { d: "M0 6 V38", stroke: INK, "stroke-width": 4, "stroke-linecap": "round" }, g);
        el("rect", { x: -34, y: 34, width: 68, height: 14, rx: 7, fill: MINT, stroke: INK, "stroke-width": 3 }, g);
        el("rect", { x: -60, y: 46, width: 120, height: 124, rx: 22, fill: MINT, stroke: INK, "stroke-width": 3 }, g);
        el("rect", { x: -48, y: 60, width: 96, height: 70, rx: 12, fill: WHITE, stroke: INK, "stroke-width": 2.5 }, g);
        const hl = el("rect", { x: -48, y: 60, width: 96, height: 70, rx: 12, fill: YEL, stroke: INK, "stroke-width": 2.5, opacity: 0 }, g);
        const lab = el("g", {}, g);
        mono(lab, 0, 90, CAB[i][0], 17, { "text-anchor": "middle" }); mono(lab, 0, 116, CAB[i][1], 17, { "text-anchor": "middle" });
        el("path", { d: "M-60 150 H60", stroke: INK, "stroke-width": 2.5 }, g);
        el("circle", { cx: 0, cy: 0, r: 8, fill: WHITE, stroke: INK, "stroke-width": 3 }, g);
        if (ghost) g.addEventListener("click", () => tapCabin(i));
        else button(g, `${CAB[i].join(" ")}: show the matching pick`, () => tapCabin(i));
        return { g, hl, lab };
      };
      const cabs = CAB.map((_, i) => ({ p: mkCab(i, false), q: mkCab(i, true) }));
      const rip = el("circle", { r: 0, fill: "none", stroke: LIL, "stroke-width": 5, opacity: 0 }, svg);
      const card = el("g", {}, svg);
      ring(card, { x: -176, y: -28, width: 352, height: 124, rx: 28 });
      el("rect", { x: -158, y: 7, width: 330, height: 84, rx: 20, fill: LIL }, card);
      el("rect", { x: -165, y: 0, width: 330, height: 84, rx: 20, fill: SKY, stroke: INK, "stroke-width": 3 }, card);
      const notch = el("path", { fill: SKY, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, card);
      const nCover = el("rect", { y: -1, width: 24, height: 5, fill: SKY }, card);
      const cName = mono(card, 0, 53, "", 30, { "text-anchor": "middle" });
      button(card, "Set the cabins moving again", () => tapCard());

      /* timeline: the line eases in, glides left, eases to a stop with Claude plan first */
      const V = 320 / 3.5, A0 = 320 - V * 0.4, A1 = A0 - V * 2.4;
      const offT = (t) => (t <= 2.4 ? 320 : t <= 3.2 ? 320 - V * 0.8 * ramp((t - 2.4) / 0.8) : t <= 5.6 ? A0 - V * (t - 3.2) : t <= 7 ? A1 - V * 1.4 * ((t - 5.6) / 1.4 - ramp((t - 5.6) / 1.4)) : 0);
      /* after a tap: "stop" eases to the next resting slot, "go" eases up to gliding speed */
      const GV = 70;
      let mode = null;
      const offI = (n) => {
        const m = mode, s = n - m.n0;
        if (m.kind === "stop") { if (s >= m.Td) return m.oT; const u = s / m.Td, b = m.v0 * m.Td, dd = m.oT - m.o0; return m.o0 + b * u + (3 * dd - 2 * b) * u * u + (b - 2 * dd) * u * u * u; }
        const dv = -GV - m.v0;
        if (s <= 1) return m.o0 + m.v0 * s + dv * ramp(s);
        return m.o0 + m.v0 + dv * 0.5 - GV * (s - 1);
      };
      /* cabins swing like a damped pendulum driven by the line's acceleration */
      const W2 = 28.5, CD = 3.0, KA = 1.9, H = 1 / 120;
      const swingT = (t) => { let th = 0, w = 0; for (let s = 2.3; s < t; s += H) { const acc = (offT(s + H) - 2 * offT(s) + offT(s - H)) / (H * H); w += (-W2 * th - CD * w + KA * acc) * H; th += w * H; } return [th, w]; };
      let pth = 0, pw = 0, pn = 0;
      const stepI = (n) => { let s = Math.max(pn, n - 0.1); while (s < n - 1e-6) { const h = Math.min(H, n - s), acc = (offI(s + H) - 2 * offI(s) + offI(s - H)) / (H * H); pw += (-W2 * pth - CD * pw + KA * acc) * h; pth += pw * h; s += h; } pn = n; };

      let lastT = 0, sel = -1, hlOn = [0, 0, 0, 0, 0], hlN = [-99, -99, -99, -99, -99], cShow = false, cN = -99, cTxt = PICK[0], tN = -99, cx0 = 185, cx1 = 185, cxN = -99, rN = -99, rI = -1, liveWas = null;
      const ev = () => api.now() - (api.calm ? 99 : 0);
      const cardXAt = (n) => lerp(cx0, cx1, io(seg(n - cxN, 0, 0.6)));
      const cur = (n) => {
        if (mode) return [offI(n), (offI(n + 1e-3) - offI(n - 1e-3)) / 2e-3];
        const t = lastT, sw = swingT(t), on = t >= 7.0;
        pth = sw[0]; pw = sw[1]; pn = n;
        hlOn = CAB.map((_, i) => (on && i === 0 ? 1 : 0)); hlN = CAB.map(() => n - 99); sel = on ? 0 : -1;
        cShow = t >= 6.95; cN = n - 99; cTxt = PICK[0]; tN = n - 99; cx0 = cx1 = 185; cxN = n - 99;
        return [offT(t), (offT(t + 1e-3) - offT(t - 1e-3)) / 2e-3];
      };
      tapCabin = (i) => {
        const n = api.now(), [o, v] = cur(n), e = ev();
        const oT = Math.abs(v) < 0.5 ? Math.round(o / 160) * 160 : Math.floor((o + (v * 1.6) / 3) / 160) * 160;
        mode = api.calm ? { kind: "stop", n0: n - 9, o0: oT, v0: 0, oT, Td: 1.6 } : { kind: "stop", n0: n, o0: o, v0: v, oT, Td: 1.6 };
        if (sel !== i) { if (sel >= 0) { hlOn[sel] = 0; hlN[sel] = e; } hlOn[i] = 1; hlN[i] = e; sel = i; }
        const to = cl(vis(at(i, oT)), 185, 615);
        if (!cShow) { cShow = true; cN = e; cx0 = cx1 = to; cxN = e; } else { cx0 = cardXAt(n); cx1 = to; cxN = e; }
        if (cTxt !== PICK[i]) { cTxt = PICK[i]; tN = e; }
        rN = e; rI = i;
        api.keep(api.calm ? 0.2 : 4.8);
      };
      tapCard = () => {
        if (!(mode ? cShow : lastT >= 6.95)) return;
        const n = api.now(), [o, v] = cur(n), e = ev();
        cShow = false; cN = e;
        if (sel >= 0) { hlOn[sel] = 0; hlN[sel] = e; }
        sel = -1;
        if (api.calm) { mode = { kind: "stop", n0: n - 9, o0: o, v0: 0, oT: o, Td: 1.6 }; api.keep(0.2); return; }
        mode = { kind: "go", n0: n, o0: o, v0: v }; api.keep(1e9);
      };
      return (t, n) => {
        lastT = t;
        const ck = oc(seg(t, 0, 1.0));
        cA.setAttribute("stroke-dashoffset", 1 - ck); cB.setAttribute("stroke-dashoffset", 1 - ck);
        clouds.forEach((c, i) => { tf(c.g, c.x + 24 * io(seg(t, 0, 9.6)) * (i ? -1 : 1), c.y, c.s); op(c.g, oc(seg(t, 0.1 + 0.2 * i, 0.9 + 0.2 * i))); });
        let o, th;
        if (mode) { o = offI(n); stepI(n); th = pth; } else { o = offT(t); th = swingT(t)[0]; }
        cabs.forEach((c, i) => {
          const dk = ob(seg(t, 0.5 + 0.1 * i, 1.1 + 0.1 * i)), x = at(i, o), xv = vis(x), xg = x < 0 ? x : x + 800, a = th * (0.92 + 0.04 * i), dy = -240 * (1 - dk);
          tf(c.p.g, xv, cy(xv) + dy, SCL, a); tf(c.q.g, xg, cy(xg) + dy, SCL, a);
          const hv = mode ? (hlOn[i] ? oc(seg(n - hlN[i], 0, 0.25)) : 1 - oc(seg(n - hlN[i], 0, 0.25))) : i === 0 ? oc(seg(t, 7.0, 7.3)) : 0;
          const lk = oc(seg(t, 1.3 + 0.08 * i, 1.7 + 0.08 * i));
          [c.p, c.q].forEach((k) => { op(k.g, dk * 3); op(k.hl, hv); op(k.lab, lk); });
        });
        let k, cx, name, tk, sx;
        if (!mode) { k = ob(seg(t, 6.95, 7.5)); cx = 185; name = PICK[0]; tk = oc(seg(t, 7.1, 7.6)); sx = vis(at(0, o)); }
        else { k = cShow ? ob(seg(n - cN, 0, 0.55)) : 1 - io(seg(n - cN, 0, 0.4)); cx = cardXAt(n); name = cTxt; tk = oc(seg(n - tN, 0.1, 0.4)); sx = sel >= 0 ? vis(at(sel, o)) : cx; }
        tf(card, cx, CY + 130 * (1 - k)); op(card, k * 2);
        const nx = cl(sx - cx, -135, 135);
        notch.setAttribute("d", `M${nx - 14} 1.5 L${nx} -15 L${nx + 14} 1.5`); nCover.setAttribute("x", nx - 12);
        cName.textContent = name; op(cName, tk); cName.setAttribute("transform", `translate(0 ${8 * (1 - tk)})`);
        const live = mode ? cShow : t >= 6.95;
        if (live !== liveWas) { liveWas = live; card.setAttribute("tabindex", live ? "0" : "-1"); card.setAttribute("aria-hidden", live ? "false" : "true"); card.style.pointerEvents = live ? "" : "none"; }
        const rk = mode ? seg(n - rN, 0, 0.6) : seg(t, 5.45, 6.05), ri = mode ? rI : 0;
        if (ri >= 0 && rk > 0 && rk < 1) { const x = vis(at(ri, o)); rip.setAttribute("cx", x); rip.setAttribute("cy", cy(x) + 95 * SCL); rip.setAttribute("r", 30 + 64 * oc(rk)); op(rip, 1 - rk); }
        else op(rip, 0);
      };
    },
  };

  /* ---- title card, 16 by 9 ---- */
  SC.hero = {
    w: 800, h: 450, dur: 6.4, still: 6.4,
    build(svg) {
      const pill = el("g", {}, svg);
      const pr = el("rect", { x: 56, y: 88, height: 34, rx: 17, fill: LIL, stroke: INK, "stroke-width": 2.5 }, pill);
      pr.setAttribute("width", tw(mono(pill, 72, 110.5, "Alternatives", 15), 108) + 32);
      const ul = el("path", { fill: "none", stroke: YEL, "stroke-width": 12, "stroke-linecap": "round", pathLength: 1, "stroke-dasharray": "1 1" }, svg);
      const t1 = txt(svg, 56, 192, "GitHub Copilot CLI", { "font-size": 46, "font-weight": 700 });
      const t2 = txt(svg, 56, 246, "alternatives", { "font-size": 46, "font-weight": 700 });
      const fs = 46 * Math.min(1, 450 / tw(t1, 480));
      t1.setAttribute("font-size", fs); t2.setAttribute("font-size", fs);
      ul.setAttribute("d", `M60 260 H${52 + tw(t2, 290)}`);
      const sub = txt(svg, 56, 302, "5 picks for the terminal agent", { "font-size": 22, "font-weight": 500 });
      const date = mono(svg, 56, 336, "Checked 19 Nov 2026", 15, { "font-weight": 500, fill: MUTE });
      const X = 548, TW = 200, Y = (i) => 126 + 54 * i;
      const tile = (y, s, fill) => {
        const g = el("g", {}, svg);
        el("rect", { x: X + 5, y: y + 5, width: TW, height: 42, rx: 12, fill: SOFT }, g);
        el("rect", { x: X, y, width: TW, height: 42, rx: 12, fill, stroke: INK, "stroke-width": 2.5 }, g);
        mono(g, X + 18, y + 27, s, 16);
        return g;
      };
      const tree = el("path", { d: `M${X} 85 H${X - 18}` + [0, 1, 2, 3, 4].map((i) => ` V${Y(i) + 21} H${X} H${X - 18}`).join(""), fill: "none", stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round", "stroke-linejoin": "round", pathLength: 1, "stroke-dasharray": "1 1" }, svg);
      const cop = tile(64, "Copilot CLI", SOFT);
      const cols = [SKY, YEL, BLUE, MINT, LIL];
      const tiles = ["Claude Code", "Munder Difflin", "Codex CLI", "OpenCode", "Qwen Code"].map((s, i) => tile(Y(i), s, cols[i]));
      return (t) => {
        const pk = ob(seg(t, 0.1, 0.55)); pill.setAttribute("transform", `translate(56 105) scale(${Math.max(0.001, pk)}) translate(-56 -105)`); op(pill, pk * 3);
        [t1, t2].forEach((n, i) => { const k = oc(seg(t, 0.25 + 0.1 * i, 0.85 + 0.1 * i)); n.setAttribute("transform", `translate(0 ${24 * (1 - k)})`); op(n, k); });
        const uk = oc(seg(t, 0.85, 1.35)); ul.setAttribute("stroke-dashoffset", 1 - uk); op(ul, uk > 0 ? 1 : 0);
        [[sub, 0.8], [date, 0.95]].forEach(([n, a]) => { const k = oc(seg(t, a, a + 0.5)); n.setAttribute("transform", `translate(0 ${14 * (1 - k)})`); op(n, k); });
        const ck = oc(seg(t, 1.1, 1.6)); cop.setAttribute("transform", `translate(0 ${-12 * (1 - ck)})`); op(cop, ck);
        const rk = oc(seg(t, 1.5, 2.3)); tree.setAttribute("stroke-dashoffset", 1 - rk); op(tree, rk > 0 ? 1 : 0);
        tiles.forEach((g, i) => { const k = ob(seg(t, 1.7 + 0.11 * i, 2.3 + 0.11 * i)); g.setAttribute("transform", `translate(${200 * (1 - k)} 0)`); op(g, k * 2.5); });
      };
    },
  };

  /* ---- player: plays once in view, rests on the final frame, a tap replays ---- */
  const q = new URLSearchParams(location.search), frozen = q.has("mgstill"), fixed = parseFloat(q.get("mgstill"));
  const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const mount = (fig) => {
    const sc = SC[fig.dataset.scene], img = fig.querySelector("img"); if (!sc || !img) return;
    const W = sc.w || 800, H = sc.h || 600;
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, class: "mg-svg", role: "group", "aria-label": img.alt || "" });
    svg.style.aspectRatio = `${W} / ${H}`;
    el("rect", { width: W, height: H, fill: "#fff" }, svg);
    img.replaceWith(svg);
    let t = calm ? sc.still : 0, prev = 0, raf = 0, seen = false, until = 0;
    const base = performance.now(), clock = () => (performance.now() - base) / 1000;
    let draw = () => {};
    const run = () => {
      const n = clock();
      if (!calm && prev) t = Math.min(sc.dur, t + Math.min(0.1, n - prev));
      prev = n; draw(t, n);
      if (seen && (t < sc.dur || n < until)) raf = requestAnimationFrame(run); else { raf = 0; prev = 0; }
    };
    const wake = () => { if (seen) { if (!raf) raf = requestAnimationFrame(run); } else draw(t, clock()); };
    const api = { calm, now: clock, seek: (s) => { t = calm ? sc.still : cl(s, 0, sc.dur); wake(); }, keep: (s) => { until = clock() + s; wake(); } };
    draw = sc.build(svg, api);
    if (frozen) { draw(isNaN(fixed) ? sc.still : cl(fixed, 0, sc.dur), 0); return; }
    new IntersectionObserver(([e]) => {
      seen = e.isIntersecting;
      if (seen) { wake(); if (!fig.dataset.sent && window.posthog) { fig.dataset.sent = 1; window.posthog.capture("blog_scene_view", { slug: location.pathname.split("/").filter(Boolean).pop(), scene: fig.dataset.scene }); } }
      else { cancelAnimationFrame(raf); raf = 0; prev = 0; }
    }, { threshold: 0.25 }).observe(fig);
    svg.addEventListener("click", () => { if (!fig.dataset.hit && window.posthog) { fig.dataset.hit = 1; window.posthog.capture("blog_scene_interact", { slug: location.pathname.split("/").filter(Boolean).pop(), scene: fig.dataset.scene }); } });
    draw(t, 0);
  };
  const go = () => document.querySelectorAll("figure.mg[data-scene]").forEach(mount);
  const fonts = document.fonts && document.fonts.load ? Promise.all([document.fonts.load('700 32px "Space Grotesk"'), document.fonts.load('500 20px "Space Grotesk"'), document.fonts.load('700 20px "JetBrains Mono"'), document.fonts.load('500 20px "JetBrains Mono"')]).catch(() => {}) : Promise.resolve();
  const start = () => fonts.then(go, go);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
